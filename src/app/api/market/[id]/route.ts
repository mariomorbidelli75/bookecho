import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/db'
import { getDemoMarketData } from '@/lib/demo-data'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = getBook(id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const marketData = book.marketData ?? getDemoMarketData(id)
  return NextResponse.json(marketData)
}
