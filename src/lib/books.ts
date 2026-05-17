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

export async function lookupByIsbn(isbn: string): Promise<Record<string, unknown> | null> {
  const clean = isbn.replace(/[-\s]/g, '')

  // Fetch all three sources in parallel
  const [olResult, gbResult, olCoverResult] = await Promise.allSettled([
    fetchOpenLibrary(clean),
    getBookByIsbn(clean),
    checkOLCover(clean),
  ])

  const olData = olResult.status === 'fulfilled' ? olResult.value : null
  const gb = gbResult.status === 'fulfilled' ? gbResult.value : null
  const gbData = gb ? mapGoogleBook(gb) : null
  const olCoverUrl = olCoverResult.status === 'fulfilled' ? olCoverResult.value : null

  if (!olData && !gbData) return null

  const merged: Record<string, unknown> = {
    ...(olData ?? {}),
    ...(gbData ? {
      cover: (olData?.cover ?? null) || gbData.cover || olCoverUrl,
      summary: (olData?.summary ?? null) || gbData.summary || null,
      genre: (olData?.genre ?? null) || gbData.genre || null,
      pages: (olData?.pages ?? null) || gbData.pages || null,
      language: (olData?.language ?? null) || gbData.language || null,
      publisher: (olData?.publisher ?? null) || gbData.publisher || null,
      year: (olData?.year ?? null) || gbData.year || null,
    } : {
      cover: (olData?.cover ?? null) || olCoverUrl,
    }),
    isbn: clean,
    title: olData?.title ?? gbData?.title,
    author: olData?.author ?? gbData?.author,
  }

  // If still no cover, use OL covers API as last resort
  if (!merged.cover && olCoverUrl) merged.cover = olCoverUrl

  return merged
}

// Verify a real JPEG cover exists on Open Library (returns null if only placeholder)
async function checkOLCover(isbn: string): Promise<string | null> {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  try {
    const res = await fetch(url, { method: 'HEAD' })
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('jpeg') || ct.includes('jpg')) return url
  } catch {}
  return null
}

async function fetchOpenLibrary(isbn: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { next: { revalidate: 86400 } } as RequestInit
    )
    if (!res.ok) return null
    const data = await res.json() as Record<string, OpenLibraryBook>
    const book = data[`ISBN:${isbn}`]
    return book?.title ? mapOpenLibraryBook(book, isbn) : null
  } catch {
    return null
  }
}

function mapOpenLibraryBook(ol: OpenLibraryBook, isbn: string): Record<string, unknown> {
  const cover = ol.cover?.large ?? ol.cover?.medium ?? ol.cover?.small ?? null
  const author = ol.authors?.map(a => a.name).join(', ') ?? 'Autore sconosciuto'
  const publisher = ol.publishers?.[0]?.name ?? null
  const yearMatch = ol.publish_date?.match(/\d{4}/)
  const year = yearMatch ? parseInt(yearMatch[0]) : null
  const pages = ol.number_of_pages ?? null
  const genre = ol.subjects
    ? (typeof ol.subjects[0] === 'string' ? ol.subjects[0] : ol.subjects[0]?.name) ?? null
    : null
  const rawDesc = ol.description
  const summary = typeof rawDesc === 'string' ? rawDesc : (rawDesc?.value ?? null)
  const langKey = ol.languages?.[0]?.key?.replace('/languages/', '') ?? null

  return { title: ol.title, author, isbn, publisher, year, cover, summary, pages, genre, language: langKey }
}

export async function searchGoogleBooks(query: string): Promise<GoogleBook[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY
  const params = new URLSearchParams({ q: query, maxResults: '5' })
  if (apiKey) params.append('key', apiKey)

  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}

export async function getBookByIsbn(isbn: string): Promise<GoogleBook | null> {
  const results = await searchGoogleBooks(`isbn:${isbn}`)
  return results[0] ?? null
}

export function mapGoogleBook(gb: GoogleBook): Record<string, unknown> {
  const info = gb.volumeInfo
  const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
    ?? info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier

  const rawThumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
  const cover = rawThumb
    ? rawThumb.replace('http:', 'https:').replace('zoom=1', 'zoom=3')
    : null

  return {
    title: info.title,
    author: info.authors?.join(', ') ?? 'Autore sconosciuto',
    isbn,
    publisher: info.publisher ?? null,
    year: info.publishedDate ? parseInt(info.publishedDate) : null,
    cover,
    summary: info.description ?? null,
    pages: info.pageCount ?? null,
    genre: info.categories?.[0] ?? null,
    language: info.language ?? null,
  }
}

// Free Wikipedia summary — tries Italian first, then English
export async function fetchWikipediaSummary(title: string, author: string): Promise<string | null> {
  const lastName = author.split(' ').filter(Boolean).pop() ?? ''
  const queries = [`${title} ${lastName}`.trim(), title]

  for (const lang of ['it', 'en']) {
    for (const query of queries) {
      try {
        const searchParams = new URLSearchParams({
          action: 'query', list: 'search',
          srsearch: query, format: 'json', srlimit: '1',
        })
        const searchRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?${searchParams}`)
        if (!searchRes.ok) continue
        const searchData = await searchRes.json()
        const firstResult = searchData.query?.search?.[0]
        if (!firstResult) continue

        const pageTitle = encodeURIComponent(firstResult.title.replace(/\s+/g, '_'))
        const summaryRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${pageTitle}`)
        if (!summaryRes.ok) continue
        const summaryData = await summaryRes.json()

        if (summaryData.extract && summaryData.extract.length > 80) {
          return summaryData.extract.slice(0, 700)
        }
      } catch {}
    }
  }
  return null
}
