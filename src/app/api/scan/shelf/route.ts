import { NextRequest, NextResponse } from 'next/server'
import { identifyBooksFromShelfImage, type SpineBook } from '@/lib/ai'
import { searchGoogleBooks, mapGoogleBook, type GoogleBook } from '@/lib/books'

// Riconoscimento di più libri da una foto di scaffale: può richiedere
// parecchi secondi tra visione e arricchimento su Google Books.
export const maxDuration = 120

const MAX_BOOKS = 24

// Dati del libro arricchiti da Google Books + provenienza della lettura del dorso
type EnrichedBook = Record<string, unknown> & {
  title: string
  author: string
  matched: boolean
  scannedTitle: string
}

// Il client la interroga per sapere se la scansione libreria è configurata,
// così da avvisare prima che l'utente scatti la foto.
export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY),
    quality: process.env.ANTHROPIC_API_KEY ? 'ai' : process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'ocr' : 'none',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    if (!image) return NextResponse.json({ error: 'Nessuna immagine ricevuta' }, { status: 400 })

    // Senza chiavi di visione il riconoscimento dei dorsi non è possibile:
    // meglio dirlo chiaramente che restituire "nessun libro trovato".
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      return NextResponse.json(
        { error: 'Scansione libreria non attiva: configura ANTHROPIC_API_KEY (consigliata) o GOOGLE_CLOUD_VISION_API_KEY nelle variabili d\'ambiente.' },
        { status: 503 }
      )
    }

    // ── 1. Claude Vision: legge i dorsi (richiede ANTHROPIC_API_KEY) ─────────
    const reading = await identifyBooksFromShelfImage(image)
    let spines: SpineBook[] = reading.books
    let source: 'claude' | 'ocr' = 'claude'

    // ── 2. Fallback OCR Google Vision: ogni riga di testo è un candidato ─────
    if (spines.length === 0) {
      const lines = await extractLinesWithGoogleVision(image)
      if (lines.length > 0) {
        source = 'ocr'
        spines = lines.map(l => ({ title: l, author: null }))
      }
    }

    if (spines.length === 0) {
      // Se Claude ha fallito e non c'è OCR di riserva, spiega il vero motivo
      if (reading.error) {
        return NextResponse.json({ error: reading.error }, { status: 503 })
      }
      return NextResponse.json(
        { error: 'Nessun libro riconosciuto nella foto. Prova con più luce, avvicinandoti ai dorsi.' },
        { status: 422 }
      )
    }

    // ── 3. Arricchimento su Google Books (copertina, ISBN, editore, anno) ────
    // Poche richieste per volta: in parallelo Google Books risponde 503.
    const enriched: EnrichedBook[] = await mapWithConcurrency(
      spines.slice(0, MAX_BOOKS),
      3,
      async (spine): Promise<EnrichedBook> => {
        const fallback: EnrichedBook = {
          title: spine.title,
          author: spine.author ?? 'Autore sconosciuto',
          matched: false,
          scannedTitle: spine.title,
        }
        try {
          let best = pickBestMatch(spine, await searchGoogleBooks(`${spine.title} ${spine.author ?? ''}`.trim()))
          // Secondo tentativo mirato solo sui titoli non trovati: la ricerca
          // libera con l'autore a volte manca edizioni accademiche o straniere.
          if (!best) {
            best = pickBestMatch(spine, await searchGoogleBooks(`intitle:"${spine.title}"`))
          }
          if (!best) return fallback
          const data = mapGoogleBook(best)
          return {
            ...data,
            title: (data.title as string) || spine.title,
            author: (data.author as string) || spine.author || 'Autore sconosciuto',
            matched: true,
            scannedTitle: spine.title,
          }
        } catch {
          return fallback
        }
      }
    )

    // Deduplica per ISBN, altrimenti per titolo normalizzato
    const seen = new Set<string>()
    const books = enriched.filter(b => {
      const key = (b.isbn as string | undefined) ?? String(b.title).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ books, source, total: books.length })
  } catch (e) {
    console.error('Shelf scan error:', e)
    return NextResponse.json({ error: 'Scansione non riuscita' }, { status: 500 })
  }
}

// Esegue `fn` su tutti gli elementi con al massimo `limit` richieste contemporanee,
// preservando l'ordine dei risultati.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return out
}

// Parole troppo comuni per distinguere un titolo da un altro.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'der', 'die', 'das', 'den', 'dem', 'und', 'ihre', 'ihr',
  'des', 'ein', 'eine', 'von', 'zur', 'zum', 'für', 'fur', 'les', 'des', 'une', 'dans',
  'del', 'della', 'delle', 'dei', 'degli', 'con', 'per', 'nel', 'nella', 'una', 'gli',
])

function contentTokens(s: string): Set<string> {
  const words = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')       // via gli accenti: "für" → "fur", non "fu r"
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  return new Set(words)
}

// Sceglie il risultato che descrive davvero il libro letto sul dorso.
// Senza questo controllo Google Books restituisce il primo risultato qualunque
// esso sia, e un dorso non trovato finisce abbinato a un libro sbagliato.
function pickBestMatch(spine: SpineBook, results: GoogleBook[]): GoogleBook | null {
  const scanned = contentTokens(spine.title)
  if (scanned.size === 0) return null
  const scannedAuthor = spine.author ? contentTokens(spine.author) : null

  let best: { book: GoogleBook; score: number } | null = null

  for (const gb of results) {
    const candidate = contentTokens(gb.volumeInfo.title ?? '')
    if (candidate.size === 0) continue

    let overlap = 0
    for (const t of scanned) if (candidate.has(t)) overlap++
    if (overlap === 0) continue

    const coverage = overlap / scanned.size       // quanto del dorso è ritrovato
    const precision = overlap / candidate.size    // quanto il candidato è pertinente
    let score = 0.7 * coverage + 0.3 * precision

    // Confronto autori: bonus se coincidono, esclusione se sono entrambi noti
    // e diversi — è il caso dei titoli omonimi di autori diversi.
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

  return best && best.score >= 0.55 ? best.book : null
}

// OCR gratuito (1000 richieste/mese) usato quando manca la chiave Anthropic.
// Tiene solo le righe che somigliano a un titolo sul dorso.
async function extractLinesWithGoogleVision(base64Image: string): Promise<string[]> {
  const key = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!key) return []

  try {
    const content = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content }, features: [{ type: 'TEXT_DETECTION', maxResults: 1 }] }],
      }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const text: string = data.responses?.[0]?.textAnnotations?.[0]?.description ?? ''

    const seen = new Set<string>()
    return text
      .split('\n')
      .map(l => l.replace(/\s+/g, ' ').trim())
      .filter(l => {
        if (l.length < 4 || l.length > 70) return false
        if (!/[a-zà-ù]{3}/i.test(l)) return false      // scarta numeri e simboli isolati
        const key = l.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .slice(0, MAX_BOOKS)
  } catch {
    return []
  }
}
