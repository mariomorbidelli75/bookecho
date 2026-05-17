import { NextRequest, NextResponse } from 'next/server'
import { getSuggestions } from '@/lib/ai'
import type { Book } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { books = [] } = await req.json() as { books: Book[] }
    const suggestions = await getSuggestions(books)
    return NextResponse.json(suggestions)
  } catch (e) {
    console.error(e)
    return NextResponse.json([], { status: 200 })
  }
}
