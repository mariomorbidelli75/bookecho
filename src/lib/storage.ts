import type { Book } from '@/types'

const KEY = 'bookecho_books'

export function getBooks(): Book[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function getBook(id: string): Book | null {
  return getBooks().find(b => b.id === id) ?? null
}

export function createBook(data: Partial<Book>): Book {
  const id = `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const now = new Date().toISOString()
  const book: Book = {
    title: 'Titolo sconosciuto',
    author: 'Autore sconosciuto',
    status: 'read',
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  }
  persistBook(book)
  return book
}

export function updateBook(id: string, updates: Partial<Book>): Book | null {
  const book = getBook(id)
  if (!book) return null
  const updated = { ...book, ...updates, updatedAt: new Date().toISOString() }
  persistBook(updated)
  return updated
}

export function deleteBook(id: string): void {
  const books = getBooks().filter(b => b.id !== id)
  localStorage.setItem(KEY, JSON.stringify(books))
}

function persistBook(book: Book): void {
  const books = getBooks()
  const idx = books.findIndex(b => b.id === book.id)
  if (idx >= 0) books[idx] = book
  else books.unshift(book)
  localStorage.setItem(KEY, JSON.stringify(books))
}
