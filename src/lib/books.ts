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
