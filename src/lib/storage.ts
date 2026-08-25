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

// ── Controllo duplicati ────────────────────────────────────────────────────
// Dopo una scansione serve sapere se il libro c'è già, sia in libreria che nel
// mercatino, per lasciare all'utente la scelta se inserirlo lo stesso.

// Confronto insensibile ad accenti, punteggiatura e maiuscole: NFD separa gli
// accenti dalle lettere e il filtro successivo li scarta ("Città" → "citta").
function norm(value?: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normIsbn(value?: string | null): string {
  return (value ?? '').replace(/[^0-9xX]/g, '').toUpperCase()
}

// Stesso ISBN, oppure stesso titolo con autore compatibile (uno contiene
// l'altro: "Eco" vs "Umberto Eco"). Se un autore manca basta il titolo.
export function isSameBook(a: Partial<Book>, b: Partial<Book>): boolean {
  const isbnA = normIsbn(a.isbn)
  const isbnB = normIsbn(b.isbn)
  if (isbnA && isbnB && isbnA === isbnB) return true

  const titleA = norm(a.title)
  const titleB = norm(b.title)
  if (!titleA || titleA !== titleB) return false

  const authorA = norm(a.author)
  const authorB = norm(b.author)
  if (!authorA || !authorB || authorA === 'autore sconosciuto' || authorB === 'autore sconosciuto') return true
  return authorA === authorB || authorA.includes(authorB) || authorB.includes(authorA)
}

// Copie già presenti in archivio (libreria + mercatino), più recenti per prime.
export function findDuplicates(candidate: Partial<Book>, books: Book[] = getBooks()): Book[] {
  if (!norm(candidate.title) && !normIsbn(candidate.isbn)) return []
  return books.filter(b => b.id !== candidate.id && isSameBook(candidate, b))
}

// Etichetta breve per dire all'utente dove si trova la copia che ha già.
export function whereIs(book: Book): string {
  if (collectionOf(book) === 'market') {
    return book.status === 'sold' ? 'Mercatino · venduto' : 'Mercatino · in vendita'
  }
  const labels: Record<string, string> = {
    read: 'Libreria · letto',
    reading: 'Libreria · in lettura',
    'to-read': 'Libreria · da leggere',
    wishlist: 'Libreria · desideri',
    sold: 'Libreria · venduto',
  }
  return labels[book.status] ?? 'Libreria'
}

// Percorso della scheda del libro, diverso tra libreria e mercatino.
export function bookHref(book: Book): string {
  return collectionOf(book) === 'market' ? `/app/mercatino/${book.id}` : `/app/book/${book.id}`
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
