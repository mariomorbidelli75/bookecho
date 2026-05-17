import { NextRequest, NextResponse } from 'next/server'
import { identifyBookFromImage } from '@/lib/ai'
import { searchGoogleBooks, mapGoogleBook } from '@/lib/books'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { image } = body

    if (!image) return NextResponse.json({ error: 'No image' }, { status: 400 })

    const aiResult = await identifyBookFromImage(image)

    if (!aiResult.title) {
      return NextResponse.json({ error: 'Libro non riconosciuto. Usa il barcode ISBN.' }, { status: 422 })
    }

    // Always try to enrich with Google Books for cover + description
    const query = `${aiResult.title} ${aiResult.author ?? ''}`.trim()
    const gbResults = await searchGoogleBooks(query)
    if (gbResults.length > 0) {
      const gbData = mapGoogleBook(gbResults[0])
      return NextResponse.json({ ...gbData, ...aiResult, found: true, confidence: 0.9 })
    }

    return NextResponse.json({ ...aiResult, found: true, confidence: 0.7 })
  } catch (e) {
    console.error('Scan error:', e)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
