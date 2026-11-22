import { NextRequest, NextResponse } from 'next/server'
import type { Book } from '@/types'
import { valueBook } from '@/lib/valuation'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { book } = await req.json() as { book: Book }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })
    return NextResponse.json(await valueBook(book))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
