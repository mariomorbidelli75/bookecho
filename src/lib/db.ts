import fs from 'fs'
import path from 'path'
import type { Book } from '@/types'
import { DEMO_BOOKS } from './demo-data'

const DB_PATH = path.join(process.cwd(), 'data', 'books.json')
// Vercel serverless has no writable project filesystem — always use demo data there
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || process.env.VERCEL === '1'

function ensureDb() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]), 'utf8')
}

export function getAllBooks(): Book[] {
  if (DEMO) return DEMO_BOOKS
  ensureDb()
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as Book[]
}

export function getBook(id: string): Book | null {
  if (DEMO) return DEMO_BOOKS.find(b => b.id === id) ?? null
  return getAllBooks().find(b => b.id === id) ?? null
}

export function saveBook(book: Book): Book {
  if (DEMO) return book
  ensureDb()
  const books = getAllBooks()
  const idx = books.findIndex(b => b.id === book.id)
  if (idx >= 0) books[idx] = book
  else books.unshift(book)
  fs.writeFileSync(DB_PATH, JSON.stringify(books, null, 2), 'utf8')
  return book
}

export function updateBook(id: string, updates: Partial<Book>): Book | null {
  if (DEMO) {
    const book = DEMO_BOOKS.find(b => b.id === id)
    if (!book) return null
    return { ...book, ...updates, updatedAt: new Date().toISOString() }
  }
  const book = getBook(id)
  if (!book) return null
  const updated = { ...book, ...updates, updatedAt: new Date().toISOString() }
  saveBook(updated)
  return updated
}

export function deleteBook(id: string): boolean {
  if (DEMO) return true
  ensureDb()
  const books = getAllBooks().filter(b => b.id !== id)
  fs.writeFileSync(DB_PATH, JSON.stringify(books, null, 2), 'utf8')
  return true
}
