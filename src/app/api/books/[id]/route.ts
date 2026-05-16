import { NextRequest, NextResponse } from 'next/server'
import { prisma, serializeBook } from '@/lib/db'
import { DEMO_BOOKS } from '@/lib/demo-data'

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (DEMO) {
    const book = DEMO_BOOKS.find(b => b.id === id)
    if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(book)
  }

  const book = await prisma.book.findUnique({ where: { id } })
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(serializeBook(book as unknown as Record<string, unknown>))
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  if (DEMO) return NextResponse.json({ ...body, id, updatedAt: new Date().toISOString() })

  const book = await prisma.book.update({
    where: { id },
    data: {
      ...body,
      emotions: body.emotions ? JSON.stringify(body.emotions) : undefined,
      marketData: body.marketData ? JSON.stringify(body.marketData) : undefined,
    }
  })
  return NextResponse.json(serializeBook(book as unknown as Record<string, unknown>))
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (DEMO) return NextResponse.json({ deleted: id })

  await prisma.book.delete({ where: { id } })
  return NextResponse.json({ deleted: id })
}
