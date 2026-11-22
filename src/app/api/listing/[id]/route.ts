import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { generateSellListing } from '@/lib/ai'
import type { Book } from '@/types'

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'listing')
  if (auth instanceof NextResponse) return auth

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
