import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/db'
import { generateSellListing } from '@/lib/ai'
import type { Book } from '@/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { platform = 'eBay' } = await req.json()
  const book = getBook(id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const listing = await generateSellListing(book as Book, platform)
  return NextResponse.json(listing)
}
