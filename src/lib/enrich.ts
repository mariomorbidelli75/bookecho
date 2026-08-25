import {
  findGoogleVolume, fetchGoogleVolume, mapGoogleBook,
  fetchOpenLibrary, fetchOpenLibraryDescription, openLibraryCover, openLibraryCoverBySearch,
  fetchWikipedia, isUsableImage, looksLikePlaceholder, titlesAgree, type SourceBook,
} from './books'
import { generateBookSummary } from './ai'
import { readSheet, writeSheet, worthCaching } from './book-cache'

// Da dove arriva ogni campo della scheda. Serve a due cose: mostrarlo
// all'utente (una trama scritta dall'AI non è una trama d'editore) e capire,
// quando manca qualcosa, quale fonte non ha risposto.
export type FieldSource = 'google' | 'openlibrary' | 'wikipedia' | 'ai' | 'photo'

export const SOURCE_LABELS: Record<FieldSource, string> = {
  google: 'Google Books',
  openlibrary: 'Open Library',
  wikipedia: 'Wikipedia',
  ai: 'sintesi AI',
  photo: 'la tua foto',
}

export interface EnrichSeed {
  title?: string | null
  author?: string | null
  isbn?: string | null
  publisher?: string | null
  year?: number | null
  cover?: string | null
  summary?: string | null
  pages?: number | null
  genre?: string | null
  language?: string | null
}

export interface EnrichOptions {
  // 'light' = solo cataloghi, per la scansione di uno scaffale intero;
  // 'full'  = aggiunge Wikipedia, ricerca copertine alternative e sintesi AI.
  level?: 'light' | 'full'
  // Foto scattata dall'utente: ultima spiaggia come copertina.
  photo?: string | null
  // La sintesi AI si usa solo quando ogni fonte reale ha fallito.
  allowAi?: boolean
}

export interface EnrichResult extends SourceBook {
  title: string
  author: string
  sources: Partial<Record<'cover' | 'summary' | 'publisher' | 'year' | 'pages' | 'genre' | 'isbn', FieldSource>>
  // Campi ancora vuoti dopo aver interrogato tutte le fonti.
  missing: string[]
  // true se il libro è stato riconosciuto in un catalogo (non solo letto dalla foto)
  matched: boolean
  // Valorizzato quando una fonte non ha risposto: la scheda è incompleta per
  // un problema temporaneo, non perché il libro non esista.
  warning?: string
  // La scheda arriva dall'archivio: nessuna fonte è stata interrogata.
  fromCache?: boolean
}

const cleanIsbn = (isbn?: string | null) => {
  const v = (isbn ?? '').replace(/[^0-9xX]/g, '')
  return /^\d{9}[\dxX]$|^\d{13}$/.test(v) ? v : null
}

// Le descrizioni dei cataloghi arrivano spesso con HTML dentro.
function cleanText(text?: string | null): string | null {
  if (!text) return null
  const stripped = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return stripped.length >= 40 ? stripped : null
}

/**
 * Costruisce la scheda più completa possibile a partire da quel poco che si sa
 * (un ISBN, oppure un titolo letto da una copertina o da un dorso).
 *
 * L'ordine delle fonti non è casuale: prima i cataloghi bibliografici, che
 * danno dati verificabili; poi Wikipedia, che descrive l'opera ma non
 * l'edizione; per ultima l'AI, che scrive bene ma non è una fonte.
 */
export async function enrichBook(seed: EnrichSeed, opts: EnrichOptions = {}): Promise<EnrichResult> {
  const { level = 'full', photo = null, allowAi = false } = opts
  const sources: EnrichResult['sources'] = {}

  // ── 0. Archivio: se questa scheda è già stata ricostruita, è finita qui ──
  // Vale per tutti gli utenti: un libro cercato una volta non dipende più
  // dalle fonti esterne, che dai server rispondono a singhiozzo.
  const cached = await readSheet(seed, level)
  if (cached) {
    const hit = { ...(cached as unknown as EnrichResult), fromCache: true }
    // La copertina di ripiego è personale: non arriva mai dall'archivio.
    if (!hit.cover && photo) {
      hit.cover = photo
      hit.sources = { ...hit.sources, cover: 'photo' }
    }
    return hit
  }

  // ── 1. Chi è questo libro, secondo Google Books ──────────────────────────
  const search = await findGoogleVolume(seed)
  let candidate = search.volume
  let googleDown = search.failed
  if (candidate && looksLikePlaceholder(candidate)) candidate = null

  const isbn = cleanIsbn(seed.isbn) ?? cleanIsbn(candidate ? mapGoogleBook(candidate).isbn : null)

  // ── 2. Open Library, in parallelo ────────────────────────────────────────
  const wantOl = level === 'full' && Boolean(isbn)
  const [ol, olDesc, olCoverRaw] = await Promise.all([
    wantOl && isbn ? fetchOpenLibrary(isbn) : Promise.resolve(null),
    wantOl && isbn ? fetchOpenLibraryDescription(isbn) : Promise.resolve(null),
    isbn ? openLibraryCover(isbn) : Promise.resolve(null),
  ])

  // ── 3. I due cataloghi si controllano a vicenda ──────────────────────────
  // Se per lo stesso ISBN parlano di libri diversi, quello di Google non è il
  // nostro libro: tenerlo significherebbe salvare copertina e trama sbagliate.
  // Si riparte allora dal titolo di Open Library, che sull'identità dell'ISBN
  // è la fonte più affidabile.
  if (candidate && ol?.title && !titlesAgree(mapGoogleBook(candidate).title, ol.title)) {
    const retry = await findGoogleVolume({ title: ol.title, author: ol.author })
    candidate = retry.volume
    if (retry.failed) googleDown = true
    if (candidate && looksLikePlaceholder(candidate)) candidate = null
  }

  // ── 4. Scheda completa del volume ────────────────────────────────────────
  // È il punto chiave: la ricerca non porta la descrizione e dà solo
  // miniature; il dettaglio porta trama lunga e copertina grande.
  const volume = candidate ? (await fetchGoogleVolume(candidate.id)) ?? candidate : null
  const gb = volume ? mapGoogleBook(volume) : null
  const olCover = gb?.cover ? null : olCoverRaw

  // ── 5. Fusione: catalogo prima, lettura della foto come riserva ─────────
  const title = gb?.title ?? ol?.title ?? seed.title ?? 'Titolo sconosciuto'
  const author = gb?.author ?? ol?.author ?? seed.author ?? 'Autore sconosciuto'

  const pick = <K extends keyof SourceBook>(field: K): { value: SourceBook[K]; from?: FieldSource } => {
    if (gb?.[field] != null) return { value: gb[field], from: 'google' }
    if (ol?.[field] != null) return { value: ol[field], from: 'openlibrary' }
    return { value: (seed[field as keyof EnrichSeed] ?? null) as SourceBook[K] }
  }

  const publisher = pick('publisher')
  const year = pick('year')
  const pages = pick('pages')
  const genre = pick('genre')
  const language = pick('language')

  if (publisher.from) sources.publisher = publisher.from
  if (year.from) sources.year = year.from
  if (pages.from) sources.pages = pages.from
  if (genre.from) sources.genre = genre.from
  if (isbn) sources.isbn = gb?.isbn ? 'google' : 'openlibrary'

  // ── 6. Trama ────────────────────────────────────────────────────────────
  let summary = cleanText(gb?.summary)
  if (summary) sources.summary = 'google'
  if (!summary && olDesc) { summary = cleanText(olDesc); if (summary) sources.summary = 'openlibrary' }
  if (!summary && ol?.summary) { summary = cleanText(ol.summary); if (summary) sources.summary = 'openlibrary' }

  // ── 7. Copertina: la migliore che risponde davvero ──────────────────────
  const candidates: Array<{ url: string; from: FieldSource }> = []
  if (gb?.cover) candidates.push({ url: gb.cover, from: 'google' })
  if (ol?.cover) candidates.push({ url: ol.cover, from: 'openlibrary' })
  if (olCover) candidates.push({ url: olCover, from: 'openlibrary' })

  // ── 8. Wikipedia: trama dell'opera e, spesso, immagine di copertina ─────
  if (level === 'full' && (!summary || candidates.length === 0) && title !== 'Titolo sconosciuto') {
    const wiki = await fetchWikipedia(title, author)
    if (wiki) {
      if (!summary) { summary = cleanText(wiki.extract); if (summary) sources.summary = 'wikipedia' }
      if (wiki.image) candidates.push({ url: wiki.image, from: 'wikipedia' })
    }
  }

  // ── 9. Copertina cercata per titolo, quando l'ISBN non basta ────────────
  if (level === 'full' && candidates.length === 0 && title !== 'Titolo sconosciuto') {
    const found = await openLibraryCoverBySearch(title, author)
    if (found) candidates.push({ url: found, from: 'openlibrary' })
  }

  let cover: string | null = null
  for (const c of candidates) {
    // In modalità leggera si evita la verifica: Google risponde in modo
    // affidabile e su uno scaffale intero ogni richiesta in più pesa.
    if (level === 'light' || c.from === 'google' || await isUsableImage(c.url)) {
      cover = c.url
      sources.cover = c.from
      break
    }
  }

  // La foto scattata dall'utente è meglio di un riquadro vuoto.
  if (!cover && photo) {
    cover = photo
    sources.cover = 'photo'
  }

  // Se la scansione aveva già una descrizione (l'ha scritta il modello che ha
  // guardato la copertina) vale più del nulla, ma resta roba dell'AI.
  if (!summary && seed.summary) {
    summary = cleanText(seed.summary)
    if (summary) sources.summary = 'ai'
  }

  // ── 10. Ultima risorsa: sintesi scritta dall'AI, dichiarata come tale ───
  if (!summary && allowAi && level === 'full' && title !== 'Titolo sconosciuto') {
    const generated = cleanText(await generateBookSummary(title, author))
    if (generated) {
      summary = generated
      sources.summary = 'ai'
    }
  }

  const result: EnrichResult = {
    title,
    author,
    isbn,
    publisher: publisher.value ?? null,
    year: year.value ?? null,
    cover,
    summary,
    pages: pages.value ?? null,
    genre: genre.value ?? null,
    language: language.value ?? null,
    sources,
    missing: [],
    matched: Boolean(gb || ol),
  }

  if (googleDown && !gb) {
    result.warning = 'Google Books non ha risposto: la scheda può essere incompleta, riprova tra qualche secondo.'
  }

  result.missing = (['cover', 'summary', 'publisher', 'year', 'isbn', 'pages', 'genre'] as const)
    .filter(k => result[k] == null)

  // Nell'archivio va la scheda "pubblica": la copertina di ripiego presa dalla
  // foto dell'utente resta nella sua libreria e non viene condivisa.
  if (worthCaching(result)) {
    const { warning: _warning, fromCache: _fromCache, ...sheet } = result
    await writeSheet(sheet as unknown as Record<string, unknown>, level)
  }

  return result
}
