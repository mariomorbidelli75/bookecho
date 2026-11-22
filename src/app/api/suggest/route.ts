import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { getSuggestions } from '@/lib/ai'
import type { Book } from '@/types'

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'suggest')
  if (auth instanceof NextResponse) return auth

  try {
    const { books = [] } = await req.json() as { books: Book[] }
    const suggestions = await getSuggestions(books)
    return NextResponse.json(suggestions)
  } catch (e) {
    console.error(e)
    return NextResponse.json([], { status: 200 })
  }
}
