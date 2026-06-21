import { NextRequest, NextResponse } from 'next/server'
import { searchByAuthor } from '@/lib/books'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  const exclude = req.nextUrl.searchParams.get('exclude')?.trim() ?? ''
  if (!name) return NextResponse.json([], { status: 200 })

  try {
    const books = await searchByAuthor(name, exclude)
    return NextResponse.json(books)
  } catch (e) {
    console.error(e)
    return NextResponse.json([], { status: 200 })
  }
}
