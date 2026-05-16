import { PrismaClient } from '@prisma/client'
import type { Book } from '@/types'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export function serializeBook(book: Record<string, unknown>): Book {
  return {
    ...book,
    emotions: book.emotions ? JSON.parse(book.emotions as string) : null,
    marketData: book.marketData ? JSON.parse(book.marketData as string) : null,
    createdAt: (book.createdAt as Date).toISOString(),
    updatedAt: (book.updatedAt as Date).toISOString(),
  } as Book
}
