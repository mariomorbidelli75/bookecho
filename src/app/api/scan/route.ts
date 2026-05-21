import { NextRequest, NextResponse } from 'next/server'
import { identifyBookFromImage } from '@/lib/ai'
import { searchGoogleBooks, mapGoogleBook } from '@/lib/books'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image } = body
    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    // ── 1. Claude Vision (best quality, requires ANTHROPIC_API_KEY) ──────────
    const aiResult = await identifyBookFromImage(image)
    if (aiResult.title) {
      const query = `${aiResult.title} ${aiResult.author ?? ''}`.trim()
      const gbResults = await searchGoogleBooks(query)
      if (gbResults.length > 0) {
        const gbData = mapGoogleBook(gbResults[0])
        return NextResponse.json({ ...gbData, ...aiResult, found: true, confidence: 0.9 })
      }
      return NextResponse.json({ ...aiResult, found: true, confidence: 0.7 })
    }

    // ── 2. Google Cloud Vision TEXT_DETECTION (free 1000/month, requires GOOGLE_CLOUD_VISION_API_KEY) ──
    const visionText = await extractTextWithGoogleVision(image)
    if (visionText) {
      // Build search query from the most prominent lines (title / author area)
      const query = visionText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 2 && l.length < 80)
        .slice(0, 4)
        .join(' ')
        .slice(0, 120)

      if (query.length > 5) {
        const gbResults = await searchGoogleBooks(query)
        if (gbResults.length > 0) {
          const book = mapGoogleBook(gbResults[0])
          return NextResponse.json({ ...book, found: true, confidence: 0.75 })
        }
      }
    }

    // ── 3. No recognition possible — client will show manual search ──────────
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
