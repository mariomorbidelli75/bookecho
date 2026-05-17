interface OpenLibraryBook {
  title?: string
  authors?: Array<{ name: string }>
  publishers?: Array<{ name: string }>
  publish_date?: string
  number_of_pages?: number
  subjects?: Array<string | { name: string }>
  cover?: { small?: string; medium?: string; large?: string }
  description?: string | { value: string }
  languages?: Array<{ key: string }>
  identifiers?: { isbn_13?: string[]; isbn_10?: string[] }
}

export async function lookupByIsbn(isbn: string): Promise<Record<string, unknown> | null> {
  const clean = isbn.replace(/[-\s]/g, '')

  let olData: Record<string, unknown> | null = null
  let gbData: Record<string, unknown> | null = null

  // Open Library (free, no key)
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
    )
    if (res.ok) {
      const data = await res.json() as Record<string, OpenLibraryBook>
      const book = data[`ISBN:${clean}`]
      if (book?.title) olData = mapOpenLibraryBook(book, clean)
    }
  } catch {}

  // Google Books (usually has better descriptions and genres)
  const gb = await getBookByIsbn(clean)
  if (gb) gbData = mapGoogleBook(gb)

  if (!olData && !gbData) return null
  if (!olData) return gbData
  if (!gbData) return olData

  // Merge both sources: take the best value for each field
  return {
    ...olData,
    cover: olData.cover || gbData.cover || `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg`,
    summary: olData.summary || gbData.summary || null,
    genre: olData.genre || gbData.genre || null,
    pages: olData.pages || gbData.pages || null,
    language: olData.language || gbData.language || null,
    publisher: olData.publisher || gbData.publisher || null,
    year: olData.year || gbData.year || null,
  }
}

function mapOpenLibraryBook(ol: OpenLibraryBook, isbn: string): Record<string, unknown> {
  const cover = ol.cover?.large ?? ol.cover?.medium ?? ol.cover?.small
    ?? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  const author = ol.authors?.map(a => a.name).join(', ') ?? 'Autore sconosciuto'
  const publisher = ol.publishers?.[0]?.name ?? null
  const yearMatch = ol.publish_date?.match(/\d{4}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null
  const pages = ol.number_of_pages ?? null
  const genre = ol.subjects
    ? (typeof ol.subjects[0] === 'string' ? ol.subjects[0] : ol.subjects[0]?.name) ?? null
    : null
  const rawDesc = ol.description
  const summary = typeof rawDesc === 'string' ? rawDesc : rawDesc?.value ?? null
  const langKey = ol.languages?.[0]?.key?.replace('/languages/', '') ?? null

  return { title: ol.title, author, isbn, publisher, year, cover, summary, pages, genre, language: langKey }
}

export interface GoogleBook {
  id: string
  volumeInfo: {
    title: string
    authors?: string[]
    publisher?: string
    publishedDate?: string
    description?: string
    pageCount?: number
    categories?: string[]
    imageLinks?: { thumbnail?: string; smallThumbnail?: string }
    industryIdentifiers?: Array<{ type: string; identifier: string }>
    language?: string
  }
}

export async function searchGoogleBooks(query: string): Promise<GoogleBook[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const params = new URLSearchParams({ q: query, maxResults: '5', langRestrict: 'it' })
  if (apiKey) params.append('key', apiKey)

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
  if (!res.ok) return []

  const data = await res.json()
  return data.items ?? []
}

export async function getBookByIsbn(isbn: string): Promise<GoogleBook | null> {
  const results = await searchGoogleBooks(`isbn:${isbn}`)
  return results[0] ?? null
}

export function mapGoogleBook(gb: GoogleBook): Record<string, unknown> {
  const info = gb.volumeInfo
  const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
    ?? info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier

  const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:') ?? null

  return {
    title: info.title,
    author: info.authors?.join(', ') ?? 'Autore sconosciuto',
    isbn,
    publisher: info.publisher,
    year: info.publishedDate ? parseInt(info.publishedDate) : null,
    cover,
    summary: info.description,
    pages: info.pageCount,
    genre: info.categories?.[0],
    language: info.language,
  }
}
