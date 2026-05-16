import { NextResponse } from 'next/server'
import { getAllBooks } from '@/lib/db'
import { getSuggestions } from '@/lib/ai'
import type { Book } from '@/types'

export async function GET() {
  const books = getAllBooks() as Book[]
  const suggestions = await getSuggestions(books)
  return NextResponse.json(suggestions)
}
