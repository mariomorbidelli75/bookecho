import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import type { Book } from '@/types'
import { valueBook } from '@/lib/valuation'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'market')
  if (auth instanceof NextResponse) return auth

  try {
    const { book } = await req.json() as { book: Book }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })
    return NextResponse.json(await valueBook(book))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore' }, { status: 500 })
  }
}
