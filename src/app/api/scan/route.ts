import { NextRequest, NextResponse } from 'next/server'
import { identifyBookFromImage } from '@/lib/ai'
import { enrichBook } from '@/lib/enrich'

// Riconoscimento + arricchimento su più cataloghi: qualche secondo.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image } = body
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    // ── 1. Claude Vision legge la copertina (richiede ANTHROPIC_API_KEY) ─────
    const seen = await identifyBookFromImage(image)
    if (seen.title) {
      // Attenzione all'ordine: quello che ha letto il modello serve solo a
      // trovare il libro, poi comandano i cataloghi. Sovrascrivere i dati del
      // catalogo con i campi (spesso nulli) della lettura lasciava la scheda
      // senza copertina e senza trama.
      const book = await enrichBook({
        title: seen.title,
        author: seen.author,
        isbn: seen.isbn,
        publisher: seen.publisher,
        year: seen.year,
        summary: seen.summary,
        genre: seen.genre,
        pages: seen.pages,
        language: seen.language,
      }, { level: 'full', allowAi: true })

      return NextResponse.json({ ...book, found: true, confidence: book.matched ? 0.9 : 0.7 })
    }

    // ── 2. Fallback OCR Google Vision (richiede GOOGLE_CLOUD_VISION_API_KEY) ─
    const visionText = await extractTextWithGoogleVision(image)
    if (visionText) {
      // Le righe più lunghe della copertina sono titolo e autore
      const query = visionText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 2 && l.length < 80)
        .slice(0, 4)
        .join(' ')
        .slice(0, 120)

      if (query.length > 5) {
        const book = await enrichBook({ title: query }, { level: 'full' })
        if (book.matched) {
          return NextResponse.json({ ...book, found: true, confidence: 0.75 })
        }
      }
    }

    // ── 3. Nessun riconoscimento — il client apre la ricerca manuale ────────
    return NextResponse.json(
      { error: 'Libro non riconosciuto automaticamente. Usa la ricerca manuale.' },
      { status: 422 }
    )
  } catch (e) {
    console.error('Scan error:', e)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}

async function extractTextWithGoogleVision(base64Image: string): Promise<string | null> {
  const key = process.env.GOOGLE_CLOUD_VISION_API_KEY
  if (!key) return null

  try {
    const content = base64Image.replace(/^data:image\/\w+;base64,/, '')
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data.responses?.[0]?.textAnnotations?.[0]?.description ?? null
  } catch {
    return null
  }
}
