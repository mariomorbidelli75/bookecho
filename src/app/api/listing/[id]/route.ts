import { NextRequest, NextResponse } from 'next/server'
import { generateSellListing } from '@/lib/ai'
import type { Book } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { book, platform = 'eBay' } = await req.json() as { book: Book; platform?: string }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })
    const listing = await generateSellListing(book, platform)
    return NextResponse.json(listing)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore generazione annuncio' }, { status: 500 })
  }
}
