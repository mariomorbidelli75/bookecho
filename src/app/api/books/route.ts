import { NextRequest, NextResponse } from 'next/server'
import { getAllBooks, saveBook } from '@/lib/db'
import type { Book } from '@/types'

export async function GET() {
  const books = getAllBooks()
  return NextResponse.json(books)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const id = `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()
  const book: Book = {
    ...body,
    id,
    status: body.status ?? 'read',
    createdAt: now,
    updatedAt: now,
  }
  const saved = saveBook(book)
  return NextResponse.json(saved, { status: 201 })
}
