import { NextRequest, NextResponse } from 'next/server'
import { prisma, serializeBook } from '@/lib/db'
import { DEMO_BOOKS } from '@/lib/demo-data'

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function GET() {
  if (DEMO) return NextResponse.json(DEMO_BOOKS)

  const books = await prisma.book.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(books.map(serializeBook))
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (DEMO) {
    return NextResponse.json({ ...body, id: `demo-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  }

  const book = await prisma.book.create({
    data: {
      ...body,
      emotions: body.emotions ? JSON.stringify(body.emotions) : null,
      marketData: body.marketData ? JSON.stringify(body.marketData) : null,
    }
  })
  return NextResponse.json(serializeBook(book as unknown as Record<string, unknown>), { status: 201 })
}
