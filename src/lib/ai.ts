import Anthropic from '@anthropic-ai/sdk'
import type { Book, SellListing, Suggestion } from '@/types'
import { DEMO_BOOKS, DEMO_SUGGESTIONS } from './demo-data'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !client

export async function identifyBookFromImage(base64Image: string): Promise<Partial<Book>> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 2000))
    return DEMO_BOOKS[Math.floor(Math.random() * DEMO_BOOKS.length)]
  }

  const response = await client!.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64Image.replace(/^data:image\/\w+;base64,/, '') }
        },
        {
          type: 'text',
          text: `Analizza questa copertina di libro e rispondi SOLO con JSON valido nel formato:
{"title":"...","author":"...","publisher":"...","year":null,"isbn":"...","genre":"...","pages":null,"summary":"...","language":"it"}
Se non riesci a identificare il libro, usa null per i campi sconosciuti.`
        }
      ]
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  return JSON.parse(match[0])
}

export async function generateBookSummary(title: string, author: string): Promise<string> {
  if (DEMO) {
    return DEMO_BOOKS.find(b => b.title === title)?.summary ?? 'Riepilogo non disponibile in modalità demo.'
  }

  const response = await client!.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Scrivi un riassunto coinvolgente di 3-4 frasi del libro "${title}" di ${author} in italiano. Solo il testo, senza titoli o prefazioni.`
    }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function generateAudioScript(book: Partial<Book>): Promise<string> {
  if (DEMO) {
    return `Benvenuto in BookEcho. Stai per ascoltare il trailer di "${book.title}" di ${book.author}. ${book.summary ?? ''} Un libro che non dimenticherai.`
  }

  const response = await client!.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Scrivi uno script per un trailer audio di 90 secondi del libro "${book.title}" di ${book.author}.
Tono: coinvolgente, come un booktrailer cinematografico. In italiano. Solo il testo parlato.
${book.summary ? `Contesto: ${book.summary}` : ''}`
    }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function generateSellListing(book: Book, platform: string): Promise<SellListing> {
  if (DEMO) {
    await new Promise(r => setTimeout(r, 1500))
    return {
      title: `${book.title} — ${book.author} | ${book.year ?? ''} ${book.publisher ?? ''} | ${platform === 'eBay' ? 'Condizioni ottime' : 'Usato buono'}`,
      description: `📚 In vendita: "${book.title}" di ${book.author}.\n\n${book.summary ?? ''}\n\nEdizione: ${book.publisher ?? 'N/D'} (${book.year ?? 'N/D'})\nPagine: ${book.pages ?? 'N/D'}\nCondizioni: molto buone, nessuna sottolineatura.\n\n✅ Spedizione sicura con imballaggio professionale.\n💬 Contattami per foto aggiuntive o informazioni.`,
      hashtags: ['#libri', `#${book.author?.replace(/\s/g, '').toLowerCase()}`, `#${book.genre?.replace(/\s/g, '').toLowerCase() ?? 'libri'}`, '#vintage', '#booklover', '#books', '#libroitalia', `#${platform.toLowerCase()}`],
      price: book.marketData?.avg ?? 15,
      platform,
      imageUrl: book.cover ?? undefined,
    }
  }

  const response = await client!.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `Crea un annuncio di vendita per ${platform} del libro "${book.title}" di ${book.author} (${book.year}, ${book.publisher}).
Prezzo stimato: €${book.marketData?.avg ?? 15}.
Rispondi SOLO con JSON: {"title":"...","description":"...","hashtags":["..."],"price":0}`
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid response')
  const data = JSON.parse(match[0])
  return { ...data, platform, imageUrl: book.cover ?? undefined }
}

export async function getSuggestions(books: Book[]): Promise<Suggestion[]> {
  if (DEMO || books.length === 0) return DEMO_SUGGESTIONS

  const readTitles = books.slice(0, 10).map(b => `"${b.title}" di ${b.author}`).join(', ')
  const emotions = [...new Set(books.flatMap(b => b.emotions ?? []))].join(', ')

  const response = await client!.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Ho letto questi libri: ${readTitles}. Le emozioni prevalenti: ${emotions}.
Suggeriscimi 4 libri in italiano o tradotti, rispondi SOLO con JSON array:
[{"title":"...","author":"...","reason":"...","matchScore":90,"year":2000,"genre":"..."}]`
    }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return DEMO_SUGGESTIONS
  return JSON.parse(match[0])
}
