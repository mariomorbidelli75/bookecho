import { NextRequest, NextResponse } from 'next/server'
import { identifyBooksFromShelfImage, type SpineBook } from '@/lib/ai'
import { searchGoogleBooks, mapGoogleBook } from '@/lib/books'

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
    let spines: SpineBook[] = await identifyBooksFromShelfImage(image)
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
      return NextResponse.json(
        { error: 'Nessun libro riconosciuto nella foto. Prova con più luce, avvicinandoti ai dorsi.' },
        { status: 422 }
      )
    }

    // ── 3. Arricchimento su Google Books (copertina, ISBN, editore, anno) ────
    const enriched: EnrichedBook[] = await Promise.all(
      spines.slice(0, MAX_BOOKS).map(async (spine): Promise<EnrichedBook> => {
        const query = `${spine.title} ${spine.author ?? ''}`.trim()
        try {
          const results = await searchGoogleBooks(query)
          if (results.length > 0) {
            const data = mapGoogleBook(results[0])
            return {
              ...data,
              // Il titolo letto dal dorso resta come fallback se Google Books non risponde
              title: (data.title as string) || spine.title,
              author: (data.author as string) || spine.author || 'Autore sconosciuto',
              matched: true,
              scannedTitle: spine.title,
            }
          }
        } catch {}
        return {
          title: spine.title,
          author: spine.author ?? 'Autore sconosciuto',
          matched: false,
          scannedTitle: spine.title,
        }
      })
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
