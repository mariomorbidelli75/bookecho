// Fonti dei dati bibliografici.
// Ogni funzione qui parla con UNA sola fonte e non decide nulla: la strategia
// (chi vince, cosa si tenta dopo) sta in `enrich.ts`.
//
// Cosa si è misurato sul campo (ago 2026), perché guida le scelte qui sotto:
// • la RICERCA di Google Books non restituisce quasi mai la descrizione e dà
//   solo miniature 128px; il DETTAGLIO del volume (`/volumes/{id}`) dà
//   descrizioni 2-8 volte più lunghe e le copertine small→extraLarge.
//   Senza la seconda chiamata metà delle schede resta senza trama e con
//   copertine sgranate: è la causa principale delle schede vuote.
// • Google Books risponde 503 sul ~5% delle richieste ravvicinate: serve
//   riprovare con attese crescenti, non arrendersi al primo errore.
// • Open Library: `jscmd=data` non porta quasi mai la descrizione, che invece
//   sta nel record "work" (`/works/OL…W.json`).
// • Le copertine di Open Library vanno chieste con `?default=false`, altrimenti
//   risponde 200 con un'immagine vuota e si finisce per salvare un buco.

export interface GoogleImageLinks {
  smallThumbnail?: string
  thumbnail?: string
  small?: string
  medium?: string
  large?: string
  extraLarge?: string
}

export interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    subtitle?: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    imageLinks?: GoogleImageLinks
    industryIdentifiers?: Array<{ type: string; identifier: string }>
    language?: string
  }
}

interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string }>
  publishers?: Array<{ name: string }>
  publish_date?: string
  number_of_pages?: number
  subjects?: Array<string | { name: string }>
  cover?: { small?: string; medium?: string; large?: string }
  description?: string | { value: string }
  languages?: Array<{ key: string }>
}

export interface SourceBook {
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── Google Books ───────────────────────────────────────────────────────────

function googleParams(extra: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams(extra)
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  if (apiKey) params.append('key', apiKey)
  return params
}

// Google Books risponde 429/503 a raffica quando riceve richieste ravvicinate
// (tipico della scansione scaffale): si riprova con attese crescenti.
// Google Books espone la stessa API su due host. Misurato dai server Vercel
// (ago 2026): ~2 richieste su 3 tornano 503, e capita anche un 200 con zero
// risultati per un ISBN che esiste. I due host però non falliscono insieme,
// quindi si alternano a ogni tentativo: è la differenza tra una scheda piena e
// una vuota quando l'app gira in cloud e non sul portatile di casa.
const GOOGLE_HOSTS = ['www.googleapis.com', 'books.googleapis.com']

// Cache in memoria delle ricerche riuscite: la stessa funzione viene riusata
// tra richieste vicine (scansione di uno scaffale, un secondo tentativo
// dell'utente) e ogni chiamata risparmiata è una chiamata che non può fallire.
const searchCache = new Map<string, { items: GoogleBook[]; at: number }>()
const CACHE_TTL = 10 * 60 * 1000
const CACHE_MAX = 300

// `failed` distingue "il libro non c'è" da "il servizio non ha risposto": senza
// questa differenza una scheda restava vuota senza che nessuno sapesse perché.
export async function searchGoogleBooksDetailed(query: string, retries = 4): Promise<{ items: GoogleBook[]; failed: boolean }> {
  const cached = searchCache.get(query)
  if (cached && Date.now() - cached.at < CACHE_TTL) return { items: cached.items, failed: false }

  // Una risposta 200 ma vuota può essere autentica ("questo ISBN non esiste")
  // oppure l'ennesimo capriccio del servizio: si ritenta, e se almeno una
  // risposta pulita è arrivata la si prende per buona.
  let cleanEmpty = false

  for (let attempt = 0; attempt <= retries; attempt++) {
    const host = GOOGLE_HOSTS[attempt % GOOGLE_HOSTS.length]
    try {
      const res = await fetch(`https://${host}/books/v1/volumes?${googleParams({ q: query, maxResults: '5' })}`)
      if (res.ok) {
        const items: GoogleBook[] = (await res.json()).items ?? []
        if (items.length > 0) {
          if (searchCache.size >= CACHE_MAX) searchCache.clear()
          searchCache.set(query, { items, at: Date.now() })
          return { items, failed: false }
        }
        cleanEmpty = true
      } else if (res.status !== 429 && res.status < 500) {
        // 4xx diversi da 429 non migliorano riprovando (chiave errata, query rotta)
        return { items: [], failed: true }
      }
    } catch {
      // errore di rete: rientra nel ciclo di retry
    }
    if (attempt < retries) await sleep(400 * (attempt + 1))
  }
  return { items: [], failed: !cleanEmpty }
}

export async function searchGoogleBooks(query: string, retries = 3): Promise<GoogleBook[]> {
  return (await searchGoogleBooksDetailed(query, retries)).items
}

// Scheda completa del volume: è QUI che stanno descrizione lunga e copertine
// ad alta risoluzione, non nei risultati di ricerca.
export async function fetchGoogleVolume(volumeId: string, retries = 3): Promise<GoogleBook | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const host = GOOGLE_HOSTS[attempt % GOOGLE_HOSTS.length]
    try {
      const res = await fetch(`https://${host}/books/v1/volumes/${volumeId}?${googleParams({})}`)
      if (res.ok) return await res.json() as GoogleBook
      if (res.status !== 429 && res.status < 500) return null
    } catch {}
    if (attempt < retries) await sleep(400 * (attempt + 1))
  }
  return null
}

// Sceglie l'immagine più grande disponibile e la ripulisce: https, niente
// effetto "pagina arricciata", zoom alto quando c'è solo la miniatura.
export function bestCover(links?: GoogleImageLinks): string | null {
  const raw = links?.extraLarge ?? links?.large ?? links?.medium ?? links?.small ?? links?.thumbnail ?? links?.smallThumbnail
  if (!raw) return null
  return raw
    .replace(/^http:/, 'https:')
    .replace(/&edge=curl/g, '')
    .replace(/([?&])zoom=1(&|$)/, '$1zoom=2$2')
}

// Google Books classifica con le categorie BISAC, in inglese e con una coda
// di sottolivelli ("Fiction / Literary"). In una scheda italiana quella
// stringa è rumore: si tiene il primo livello, tradotto quando lo conosciamo.
const GENRE_IT: Record<string, string> = {
  'fiction': 'Narrativa',
  'juvenile fiction': 'Ragazzi',
  'young adult fiction': 'Young adult',
  'biography & autobiography': 'Biografie',
  'history': 'Storia',
  'philosophy': 'Filosofia',
  'psychology': 'Psicologia',
  'religion': 'Religione',
  'body, mind & spirit': 'Spiritualità',
  'science': 'Scienze',
  'social science': 'Scienze sociali',
  'political science': 'Politica',
  'business & economics': 'Economia',
  'self-help': 'Crescita personale',
  'health & fitness': 'Salute',
  'cooking': 'Cucina',
  'travel': 'Viaggi',
  'art': 'Arte',
  'photography': 'Fotografia',
  'music': 'Musica',
  'performing arts': 'Spettacolo',
  'poetry': 'Poesia',
  'drama': 'Teatro',
  'comics & graphic novels': 'Fumetti',
  'literary criticism': 'Critica letteraria',
  'true crime': 'True crime',
  'sports & recreation': 'Sport',
  'nature': 'Natura',
  'computers': 'Informatica',
  'mathematics': 'Matematica',
  'medical': 'Medicina',
  'law': 'Diritto',
  'education': 'Educazione',
  'family & relationships': 'Famiglia',
  'humor': 'Umorismo',
  'reference': 'Consultazione',
}

export function normalizeGenre(category?: string | null): string | null {
  if (!category) return null
  const top = category.split('/')[0].trim()
  return GENRE_IT[top.toLowerCase()] ?? top
}

export function mapGoogleBook(gb: GoogleBook): SourceBook {
  const info = gb.volumeInfo
  const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
    ?? info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier
    ?? null

  return {
    title: info.subtitle ? `${info.title}. ${info.subtitle}` : info.title,
    author: info.authors?.join(', ') ?? null,
    isbn,
    publisher: info.publisher ?? null,
    year: info.publishedDate ? parseInt(info.publishedDate) || null : null,
    cover: bestCover(info.imageLinks),
    summary: info.description ?? null,
    pages: info.pageCount ?? null,
    genre: normalizeGenre(info.categories?.[0]),
    language: info.language ?? null,
  }
}

// ── Scelta del candidato giusto ────────────────────────────────────────────
// Senza questo controllo Google Books restituisce il primo risultato qualunque
// esso sia, e un titolo non trovato finisce abbinato a un libro sbagliato,
// con copertina e ISBN di un altro volume.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'der', 'die', 'das', 'den', 'dem', 'und', 'ihre', 'ihr',
  'des', 'ein', 'eine', 'von', 'zur', 'zum', 'für', 'fur', 'les', 'une', 'dans',
  'del', 'della', 'delle', 'dei', 'degli', 'con', 'per', 'nel', 'nella', 'una', 'gli',
])

export function contentTokens(s: string): Set<string> {
  const words = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')       // via gli accenti: "für" → "fur", non "fu r"
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  return new Set(words)
}

export interface MatchSeed {
  title: string
  author?: string | null
}

export function pickBestMatch(seed: MatchSeed, results: GoogleBook[], threshold = 0.55): GoogleBook | null {
  const scanned = contentTokens(seed.title)
  if (scanned.size === 0) return null
  const scannedAuthor = seed.author ? contentTokens(seed.author) : null

  let best: { book: GoogleBook; score: number } | null = null

  for (const gb of results) {
    const candidate = contentTokens(gb.volumeInfo.title ?? '')
    if (candidate.size === 0) continue

    let overlap = 0
    for (const t of scanned) if (candidate.has(t)) overlap++
    if (overlap === 0) continue

    const coverage = overlap / scanned.size       // quanto del titolo cercato è ritrovato
    const precision = overlap / candidate.size    // quanto il candidato è pertinente
    let score = 0.7 * coverage + 0.3 * precision

    // Autori: bonus se coincidono, esclusione se sono entrambi noti e diversi
    // — è il caso dei titoli omonimi di autori diversi.
    if (scannedAuthor?.size) {
      const authors = contentTokens((gb.volumeInfo.authors ?? []).join(' '))
      if (authors.size > 0) {
        let sameAuthor = false
        for (const t of scannedAuthor) {
          if (authors.has(t)) { sameAuthor = true; break }
        }
        if (!sameAuthor) continue
        score += 0.15
      }
    }

    if (!best || score > best.score) best = { book: gb, score }
  }

  return best && best.score >= threshold ? best.book : null
}

// In catalogo finiscono schede autopubblicate con i campi lasciati al valore
// di esempio ("Titulo" di "Autor"), a volte con l'ISBN di un libro vero.
// Vanno scartate: portano copertina e trama di tutt'altro volume.
const PLACEHOLDER = /^(titulo|título|title|untitled|senza titolo|sin título|nome do livro|autor|author|unknown|sconosciuto|nome do autor)$/i

export function looksLikePlaceholder(gb: GoogleBook): boolean {
  const title = (gb.volumeInfo.title ?? '').trim()
  const authors = gb.volumeInfo.authors ?? []
  return PLACEHOLDER.test(title) || (authors.length > 0 && authors.every(a => PLACEHOLDER.test(a.trim())))
}

// Due cataloghi che descrivono lo stesso ISBN devono almeno concordare sul
// titolo: se non hanno una parola in comune, uno dei due sta sbagliando libro.
export function titlesAgree(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return true
  const ta = contentTokens(a)
  const tb = contentTokens(b)
  if (ta.size === 0 || tb.size === 0) return true
  for (const t of ta) if (tb.has(t)) return true
  return false
}

// Cerca su Google Books il volume che corrisponde davvero al libro indicato,
// provando prima l'ISBN e poi titolo+autore in due formulazioni.
export interface VolumeSearch {
  volume: GoogleBook | null
  // true quando Google Books non ha risposto: il libro potrebbe esserci lo
  // stesso, e all'utente va detto di riprovare invece di dargli una scheda vuota.
  failed: boolean
}

export async function findGoogleVolume(seed: { title?: string | null; author?: string | null; isbn?: string | null }): Promise<VolumeSearch> {
  let failed = false

  if (seed.isbn) {
    const wanted = seed.isbn.replace(/[-\s]/g, '')
    const res = await searchGoogleBooksDetailed(`isbn:${wanted}`)
    failed = res.failed
    const byIsbn = res.items
    // Non basta prendere il primo risultato: la ricerca per ISBN a volte
    // risponde con un volume che quell'ISBN non ce l'ha (capita con le edizioni
    // autopubblicate, che arrivano in catalogo con dati fasulli tipo
    // "Titulo" di "Autor"). Si tiene solo chi dichiara davvero il codice.
    const exact = byIsbn.find(gb =>
      (gb.volumeInfo.industryIdentifiers ?? []).some(i => i.identifier.replace(/[-\s]/g, '') === wanted)
    )
    // Molte schede legittime non riportano l'ISBN tra gli identificativi, quindi
    // l'eco del codice è una preferenza, non un requisito.
    const chosen = exact ?? byIsbn.find(gb => !looksLikePlaceholder(gb)) ?? null
    if (chosen) return { volume: chosen, failed: false }
  }
  if (!seed.title) return { volume: null, failed }

  const author = seed.author && seed.author !== 'Autore sconosciuto' ? seed.author : null
  const title = seed.title
  const queries = [
    author ? `intitle:"${title}" inauthor:"${author}"` : `intitle:"${title}"`,
    `${title} ${author ?? ''}`.trim(),
  ]
  for (const q of queries) {
    const res = await searchGoogleBooksDetailed(q)
    if (res.failed) failed = true
    const found = pickBestMatch({ title, author }, res.items)
    if (found) return { volume: found, failed: false }
  }
  return { volume: null, failed }
}

// ── Open Library ───────────────────────────────────────────────────────────

export async function fetchOpenLibrary(isbn: string): Promise<SourceBook | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 86400 } } as RequestInit
    )
    if (!res.ok) return null
    const data = await res.json() as Record<string, OpenLibraryBook>
    const ol = data[`ISBN:${isbn}`]
    if (!ol?.title) return null

    const yearMatch = ol.publish_date?.match(/\d{4}/)
    const rawDesc = ol.description
    const subject = ol.subjects
      ? (typeof ol.subjects[0] === 'string' ? ol.subjects[0] : ol.subjects[0]?.name) ?? null
      : null

    return {
      title: ol.title,
      author: ol.authors?.map(a => a.name).join(', ') ?? null,
      isbn,
      publisher: ol.publishers?.[0]?.name ?? null,
      year: yearMatch ? parseInt(yearMatch[0]) : null,
      cover: ol.cover?.large ?? ol.cover?.medium ?? null,
      summary: typeof rawDesc === 'string' ? rawDesc : (rawDesc?.value ?? null),
      pages: ol.number_of_pages ?? null,
      genre: normalizeGenre(subject),
      language: ol.languages?.[0]?.key?.replace('/languages/', '') ?? null,
    }
  } catch {
    return null
  }
}

// La descrizione su Open Library sta quasi sempre nel record "work", non
// nell'edizione: due salti, ma è l'unico modo per averla.
export async function fetchOpenLibraryDescription(isbn: string): Promise<string | null> {
  try {
    const edition = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { next: { revalidate: 86400 } } as RequestInit)
    if (!edition.ok) return null
    const workKey: string | undefined = (await edition.json()).works?.[0]?.key
    if (!workKey) return null

    const work = await fetch(`https://openlibrary.org${workKey}.json`, { next: { revalidate: 86400 } } as RequestInit)
    if (!work.ok) return null
    const desc = (await work.json()).description
    const text: string | null = typeof desc === 'string' ? desc : (desc?.value ?? null)
    if (!text) return null
    // Le descrizioni OL finiscono spesso con la fonte tra parentesi quadre
    return text.replace(/\s*\[?\(?source:[^)\]]*\)?\]?\s*$/i, '').trim()
  } catch {
    return null
  }
}

// Copertina di Open Library per ISBN. `default=false` è indispensabile:
// senza, l'API risponde 200 con un'immagine vuota.
export async function openLibraryCover(isbn: string): Promise<string | null> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) return url
  } catch {}
  return null
}

// Copertina quando l'ISBN non è noto o non è in catalogo: si cerca l'opera.
export async function openLibraryCoverBySearch(title: string, author?: string | null): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, limit: '3', fields: 'title,author_name,cover_i' })
    if (author && author !== 'Autore sconosciuto') params.set('author', author)
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, { next: { revalidate: 86400 } } as RequestInit)
    if (!res.ok) return null
    const docs: Array<{ title?: string; cover_i?: number }> = (await res.json()).docs ?? []
    const wanted = contentTokens(title)
    for (const doc of docs) {
      if (!doc.cover_i) continue
      const got = contentTokens(doc.title ?? '')
      let overlap = 0
      for (const t of wanted) if (got.has(t)) overlap++
      if (wanted.size > 0 && overlap / wanted.size < 0.6) continue
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
    }
  } catch {}
  return null
}

// ── Wikipedia ──────────────────────────────────────────────────────────────

export interface WikipediaResult {
  extract: string
  image: string | null
  lang: 'it' | 'en'
  title: string
}

// Riassunto gratuito da Wikipedia, prima in italiano poi in inglese.
// Sceglie l'articolo del LIBRO, non del film/videogioco/album omonimo, e
// riporta anche l'immagine dell'articolo: spesso è proprio la copertina.
export async function fetchWikipedia(title: string, author: string): Promise<WikipediaResult | null> {
  const lastName = author.split(' ').filter(Boolean).pop() ?? ''
  const queries = [
    `${title} ${lastName} romanzo`.trim(),
    `${title} ${lastName} libro`.trim(),
    `${title} ${lastName}`.trim(),
    title,
  ]

  let fallback: WikipediaResult | null = null

  for (const lang of ['it', 'en'] as const) {
    for (const query of queries) {
      try {
        const searchParams = new URLSearchParams({
          action: 'query', list: 'search', srsearch: query, format: 'json', srlimit: '5', origin: '*',
        })
        const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?${searchParams}`)
        if (!searchRes.ok) continue
        const results: Array<{ title: string }> = (await searchRes.json()).query?.search ?? []

        for (const result of results) {
          const pageTitle = encodeURIComponent(result.title.replace(/\s+/g, '_'))
          const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`)
          if (!summaryRes.ok) continue
          const data = await summaryRes.json()
          const extract: string = data.extract ?? ''
          if (extract.length <= 80) continue

          const hit: WikipediaResult = {
            extract: extract.slice(0, 900),
            image: data.originalimage?.source ?? data.thumbnail?.source ?? null,
            lang,
            title: data.title ?? result.title,
          }
          const verdict = classifyWikipediaArticle(data.description ?? '', extract)
          if (verdict === 'book') return hit
          // Tiene da parte un articolo neutro, se non si trova mai un libro esplicito
          if (verdict === 'neutral' && !fallback) fallback = hit
        }
      } catch {}
    }
  }
  return fallback
}

// Decide se un articolo di Wikipedia parla di un libro o di un film/videogioco.
function classifyWikipediaArticle(description: string, extract: string): 'book' | 'other' | 'neutral' {
  const text = `${description} ${extract.slice(0, 200)}`.toLowerCase()
  const bookHints = /\b(romanzo|libro|saggio|racconto|novella|raccolta|novel|book|memoir|poesia|poem)\b/
  const otherHints = /\b(film|movie|pellicola|videogioco|video game|videogame|album|singolo|canzone|song|serie tv|serie televisiva|tv series|episodio|episode|miniserie|opera teatrale|fumetto|graphic novel|sceneggiat|diretto da|directed by|sviluppato da|developed by)\b/

  if (otherHints.test(text)) return 'other'
  if (bookHints.test(text)) return 'book'
  return 'neutral'
}

// ── Utilità ────────────────────────────────────────────────────────────────

// Un URL di copertina vale solo se risponde davvero con un'immagine: meglio
// scoprirlo qui che mostrare un riquadro rotto nella scheda del libro.
export async function isUsableImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) })
    if (!res.ok) return false
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return false
    const len = Number(res.headers.get('content-length') ?? '0')
    // Le copertine "vuote" di Open Library pesano poche centinaia di byte
    return len === 0 || len > 1200
  } catch {
    return false
  }
}

export interface AuthorBook {
  title: string
  author: string
  year: number | null
  cover: string | null
  isbn: string | null
}

// Altri libri dello stesso autore (Google Books `inauthor:`).
// Deduplica per titolo normalizzato e ordina dal più recente.
export async function searchByAuthor(author: string, excludeTitle = '', limit = 8): Promise<AuthorBook[]> {
  if (!author || author === 'Autore sconosciuto') return []

  const params = googleParams({
    q: `inauthor:"${author}"`,
    maxResults: '40',
    orderBy: 'relevance',
    printType: 'books',
    langRestrict: 'it',
  })

  // Anche qui i due host si alternano: uno dei due di solito risponde.
  let items: GoogleBook[] = []
  for (const host of GOOGLE_HOSTS) {
    try {
      const res = await fetch(`https://${host}/books/v1/volumes?${params}`, {
        next: { revalidate: 86400 },
      } as RequestInit)
      if (res.ok) {
        items = (await res.json()).items ?? []
        if (items.length > 0) break
      }
    } catch {
      // si prova l'host successivo
    }
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const excluded = normalize(excludeTitle)
  const seen = new Set<string>()
  const out: AuthorBook[] = []

  for (const gb of items) {
    const mapped = mapGoogleBook(gb)
    const title = mapped.title
    if (!title) continue
    const key = normalize(title)
    if (!key || key === excluded || seen.has(key)) continue
    // Tieni solo i libri in cui l'autore compare davvero
    const authors = gb.volumeInfo.authors?.map(a => a.toLowerCase()) ?? []
    if (!authors.some(a => a.includes(author.toLowerCase().split(',')[0].trim()))) continue
    seen.add(key)
    out.push({
      title,
      author: mapped.author ?? 'Autore sconosciuto',
      year: mapped.year ?? null,
      cover: mapped.cover ?? null,
      isbn: mapped.isbn ?? null,
    })
  }

  return out
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    .slice(0, limit)
}
