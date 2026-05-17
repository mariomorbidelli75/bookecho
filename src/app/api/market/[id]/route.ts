import { NextRequest, NextResponse } from 'next/server'
import type { Book } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { book } = await req.json() as { book: Book }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })
    return NextResponse.json(estimateMarketValue(book))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}

function estimateMarketValue(book: Book) {
  const year = book.year ?? 2000
  const age = new Date().getFullYear() - year
  let base = 10
  if (age > 60) base = 35
  else if (age > 40) base = 22
  else if (age > 20) base = 14
  else base = 9

  const min = Math.max(3, Math.round(base * 0.6))
  const max = Math.round(base * 2.8)
  const avg = Math.round((min + max) / 2)

  const q = encodeURIComponent(`${book.title} ${book.author}`)

  return {
    min, max, avg,
    currency: 'EUR',
    lastUpdated: new Date().toISOString(),
    sources: [
      { platform: 'eBay', price: Math.round(avg * 0.9), url: `https://www.ebay.it/sch/i.html?_nkw=${q}&_sacat=267`, condition: 'Usato' },
      { platform: 'Subito', price: min, url: `https://www.subito.it/annunci-italia/vendita/libri-e-riviste/?q=${q}`, condition: 'Usato' },
      { platform: 'Vinted', price: Math.round(min * 1.2), url: `https://www.vinted.it/catalog?search_text=${q}`, condition: 'Buono' },
      { platform: 'Catawiki', price: max, url: `https://www.catawiki.com/it/l/libri?q=${q}`, condition: 'Ottimo' },
    ],
  }
}
