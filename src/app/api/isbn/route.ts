import { NextRequest, NextResponse } from 'next/server'
import { lookupByIsbn } from '@/lib/books'
import { generateBookSummary } from '@/lib/ai'

export async function GET(req: NextRequest) {
  const isbn = req.nextUrl.searchParams.get('isbn')
  if (!isbn) return NextResponse.json({ error: 'ISBN mancante' }, { status: 400 })

  const clean = isbn.replace(/[-\s]/g, '')
  if (!/^\d{10}(\d{3})?$/.test(clean)) {
    return NextResponse.json({ error: 'ISBN non valido' }, { status: 400 })
  }

  const book = await lookupByIsbn(clean)
  if (!book) return NextResponse.json({ error: 'Libro non trovato' }, { status: 404 })

  // Try AI summary if none found
  if (!book.summary && book.title && book.author) {
    const aiSummary = await generateBookSummary(book.title as string, book.author as string)
    if (aiSummary) book.summary = aiSummary
  }

  return NextResponse.json({ ...book, found: true, confidence: 0.95 })
}
