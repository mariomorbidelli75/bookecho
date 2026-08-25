import { NextRequest, NextResponse } from 'next/server'
import { enrichBook } from '@/lib/enrich'

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get('isbn')
  if (!isbn) return NextResponse.json({ error: 'ISBN mancante' }, { status: 400 })

  const clean = isbn.replace(/[-\s]/g, '')
  if (!/^\d{10}(\d{3})?$/.test(clean)) {
    return NextResponse.json({ error: 'ISBN non valido' }, { status: 400 })
  }

  // Catalogo → Open Library → Wikipedia → sintesi AI: la scheda si costruisce
  // scendendo di fonte in fonte finché i campi non sono pieni.
  const book = await enrichBook({ isbn: clean }, { level: 'full', allowAi: true })

  if (!book.matched && !book.summary) {
    return NextResponse.json({ error: `ISBN ${clean} non trovato nei cataloghi.` }, { status: 404 })
  }

  return NextResponse.json({ ...book, found: true, confidence: book.matched ? 0.95 : 0.6 })
}
