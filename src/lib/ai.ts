import Anthropic from '@anthropic-ai/sdk'
import type { Book, SellListing, Suggestion } from '@/types'
import { searchGoogleBooks, mapGoogleBook } from './books'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function identifyBookFromImage(base64Image: string): Promise<Partial<Book>> {
  if (!client) return {}
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image.replace(/^data:image\/\w+;base64,/, '') } },
        { type: 'text', text: `Analizza questa copertina di libro e rispondi SOLO con JSON valido:\n{"title":"...","author":"...","publisher":"...","year":null,"isbn":"...","genre":"...","pages":null,"summary":"...","language":"it"}\nSe non riesci a identificare il libro, usa null per i campi sconosciuti.` }
      ]
    }]
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try { return JSON.parse(match[0]) } catch { return {} }
}

export async function generateBookSummary(title: string, author: string): Promise<string | null> {
  if (!client) return null
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      messages: [{ role: 'user', content: `Scrivi un riassunto coinvolgente di 3-4 frasi del libro "${title}" di ${author} in italiano. Solo il testo, senza titoli o prefazioni.` }]
    })
    return response.content[0].type === 'text' ? response.content[0].text : null
  } catch { return null }
}

export async function generateAudioScript(book: Partial<Book>): Promise<string> {
  if (client) {
    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 512,
        messages: [{ role: 'user', content: `Scrivi uno script per un trailer audio di 90 secondi del libro "${book.title}" di ${book.author}. Tono: coinvolgente, come un booktrailer cinematografico. In italiano. Solo il testo parlato.\n${book.summary ? `Contesto: ${book.summary}` : ''}` }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      if (text) return text
    } catch {}
  }
  return buildAudioScript(book)
}

function buildAudioScript(book: Partial<Book>): string {
  const year = book.year ? `, pubblicato nel ${book.year},` : ''
  const genre = book.genre ? ` Un ${book.genre.toLowerCase()}.` : ''
  const summary = book.summary ? ` ${book.summary}` : ''
  return `Benvenuto in BookEcho. "${book.title}" di ${book.author}${year} ti aspetta.${genre}${summary} Un libro che non dimenticherai.`
}

export async function generateSellListing(book: Book, platform: string): Promise<SellListing> {
  if (client) {
    try {
      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 800,
        messages: [{ role: 'user', content: `Crea un annuncio di vendita per ${platform} del libro "${book.title}" di ${book.author} (${book.year ?? 'N/D'}, ${book.publisher ?? 'N/D'}). Prezzo stimato: €${book.marketData?.avg ?? 12}. In italiano. Rispondi SOLO con JSON: {"title":"...","description":"...","hashtags":["..."]}` }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        const data = JSON.parse(match[0])
        return { ...data, price: book.marketData?.avg ?? 12, platform, imageUrl: book.cover ?? undefined }
      }
    } catch {}
  }
  return buildSellListing(book, platform)
}

function buildSellListing(book: Book, platform: string): SellListing {
  const year = book.year ? ` (${book.year})` : ''
  const publisher = book.publisher ? ` - ${book.publisher}` : ''
  const pages = book.pages ? `\n📄 ${book.pages} pagine` : ''
  const genre = book.genre ? `\n📚 Genere: ${book.genre}` : ''
  const summary = book.summary ? `\n\n${book.summary.slice(0, 300)}` : ''
  const price = book.marketData?.avg ?? 12

  const title = `${book.title} - ${book.author}${year}${publisher}`.slice(0, 80)
  const description = `📚 In vendita: "${book.title}" di ${book.author}.${year}${publisher ? `\nEditore: ${book.publisher}` : ''}${pages}${genre}${summary}\n\n✅ Condizioni: buone\n📦 Spedizione rapida e sicura.\n💬 Contattami per foto aggiuntive.`

  const hashtags = [
    '#libri', '#libriusati', '#booklover',
    `#${(book.author?.split(' ').pop() ?? 'autore').toLowerCase()}`,
    book.genre ? `#${book.genre.replace(/\s+/g, '').toLowerCase().slice(0, 20)}` : '#romanzo',
    `#${platform.toLowerCase()}`,
  ]

  return { title, description, hashtags, price, platform, imageUrl: book.cover ?? undefined }
}

export async function getSuggestions(books: Book[]): Promise<Suggestion[]> {
  if (client && books.length > 0) {
    try {
      const readTitles = books.slice(0, 10).map(b => `"${b.title}" di ${b.author}`).join(', ')
      const emotions = [...new Set(books.flatMap(b => b.emotions ?? []))].join(', ')
      const response = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `Ho letto questi libri: ${readTitles}. Emozioni prevalenti: ${emotions}.\nSuggeriscimi 4 libri in italiano o tradotti, rispondi SOLO con JSON array:\n[{"title":"...","author":"...","reason":"...","matchScore":90,"year":2000,"genre":"..."}]` }]
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const match = text.match(/\[[\s\S]*\]/)
      if (match) {
        const raw: Suggestion[] = JSON.parse(match[0])
        const enriched = await Promise.all(raw.map(async s => {
          const gbs = await searchGoogleBooks(`${s.title} ${s.author}`)
          const cover = gbs[0] ? (mapGoogleBook(gbs[0]).cover as string | null) : null
          return { ...s, cover: cover ?? undefined }
        }))
        return enriched
      }
    } catch {}
  }
  return getSuggestionsFromGoogleBooks(books)
}

async function getSuggestionsFromGoogleBooks(books: Book[]): Promise<Suggestion[]> {
  const genres = [...new Set(books.flatMap(b => b.genre ? [b.genre] : []))].slice(0, 2)
  const authors = [...new Set(books.map(b => b.author))].slice(0, 2)
  const existingTitles = new Set(books.map(b => b.title.toLowerCase()))

  const queries = genres.length > 0
    ? genres.map(g => `subject:${g} language:ita`)
    : authors.map(a => `inauthor:"${a}"`)

  if (queries.length === 0) queries.push('bestseller italiano libri')

  const results: Suggestion[] = []
  for (const query of queries) {
    try {
      const gbs = await searchGoogleBooks(query)
      for (const gb of gbs) {
        if (results.length >= 4) break
        const t = gb.volumeInfo.title
        if (existingTitles.has(t.toLowerCase())) continue
        const mapped = mapGoogleBook(gb)
        results.push({
          title: t,
          author: gb.volumeInfo.authors?.join(', ') ?? 'Autore sconosciuto',
          cover: (mapped.cover as string | null) ?? undefined,
          reason: genres.length > 0 ? `Simile al genere ${genres[0]}` : `Dell\'autore ${authors[0] ?? ''}`,
          matchScore: Math.floor(Math.random() * 15) + 75,
          isbn: (mapped.isbn as string | null) ?? undefined,
          year: (mapped.year as number | null) ?? undefined,
          genre: gb.volumeInfo.categories?.[0],
        })
      }
    } catch {}
    if (results.length >= 4) break
  }
  return results.slice(0, 4)
}
