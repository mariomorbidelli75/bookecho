import type { Book, Collection } from '@/types'

const KEY = 'bookecho_books'

export function getBooks(): Book[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

// I libri salvati prima del mercatino non hanno `collection`: valgono come libreria.
export function collectionOf(book: Book): Collection {
  return book.collection === 'market' ? 'market' : 'library'
}

// Libri della libreria personale (esclude tutto il mercatino).
export function getLibraryBooks(): Book[] {
  return getBooks().filter(b => collectionOf(b) === 'library')
}

// Libri del mercatino: in vendita + già venduti.
export function getMarketBooks(): Book[] {
  return getBooks().filter(b => collectionOf(b) === 'market')
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
    collection: 'library',
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

// Sposta un libro nel mercatino mettendolo in vendita al prezzo indicato.
export function moveToMarket(id: string, listingPrice?: number | null): Book | null {
  return updateBook(id, {
    collection: 'market',
    status: 'for-sale',
    listingPrice: listingPrice ?? null,
    listedAt: new Date().toISOString(),
  })
}

// Riporta un libro dal mercatino alla libreria personale.
export function moveToLibrary(id: string): Book | null {
  return updateBook(id, { collection: 'library', status: 'read' })
}

// Registra la vendita: prezzo, data (default oggi) e canale.
export function markAsSold(
  id: string,
  { price, date, channel }: { price?: number | null; date?: string; channel?: string | null }
): Book | null {
  return updateBook(id, {
    status: 'sold',
    soldPrice: price ?? null,
    soldAt: date ? new Date(`${date}T12:00:00`).toISOString() : new Date().toISOString(),
    soldChannel: channel?.trim() ? channel.trim() : null,
  })
}

function persistBook(book: Book): void {
  const books = getBooks()
  const idx = books.findIndex(b => b.id === book.id)
  if (idx >= 0) books[idx] = book
  else books.unshift(book)
  localStorage.setItem(KEY, JSON.stringify(books))
}
