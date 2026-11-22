import Anthropic from '@anthropic-ai/sdk'
import type { Book, MarketData, MarketSource } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Valutazione del prezzo di un libro.
//
// 1. Prezzo di copertina da Google Books (gratis, quando c'è).
// 2. Annunci reali: Claude Haiku cerca il libro sui portali italiani dell'usato
//    e da collezione con la ricerca web (≈ 1-3 centesimi a valutazione) e legge
//    i prezzi degli annunci trovati.
// 3. Se non trova nulla: stima indicativa in base all'età, dichiarata come tale.
// Il risultato viene salvato nella scheda del libro, quindi si paga una volta sola.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = 'claude-haiku-5-5'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

// Portali in cui cercare: usato, collezione e (come riferimento) nuovo
const PORTALS: Record<string, string> = {
  'ebay.it': 'eBay',
  'vinted.it': 'Vinted',
  'subito.it': 'Subito',
  'abebooks.it': 'AbeBooks',
  'maremagnum.com': 'Maremagnum',
  'comprovendolibri.it': 'Comprovendolibri',
  'libraccio.it': 'Libraccio',
  'catawiki.com': 'Catawiki',
  'amazon.it': 'Amazon',
  'ibs.it': 'IBS',
}

function platformOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const key = Object.keys(PORTALS).find(d => host === d || host.endsWith(`.${d}`))
    return key ? PORTALS[key] : null
  } catch { return null }
}

function searchLinks(book: Book): MarketSource[] {
  const q = encodeURIComponent(`${book.title} ${book.author ?? ''}`.trim())
  return [
    { platform: 'eBay', url: `https://www.ebay.it/sch/i.html?_nkw=${q}&_sacat=267`, condition: 'Cerca' },
    { platform: 'Vinted', url: `https://www.vinted.it/catalog?search_text=${q}`, condition: 'Cerca' },
    { platform: 'Subito', url: `https://www.subito.it/annunci-italia/vendita/libri-e-riviste/?q=${q}`, condition: 'Cerca' },
    { platform: 'AbeBooks', url: `https://www.abebooks.it/servlet/SearchResults?kn=${q}`, condition: 'Cerca' },
    { platform: 'Maremagnum', url: `https://www.maremagnum.com/it/ricerca/?q=${q}`, condition: 'Cerca' },
  ].map(s => ({ ...s, price: 0 }))
}

// ── 1. Prezzo di copertina (Google Books) ───────────────────────────────────
async function coverPrice(book: Book): Promise<number | null> {
  const isbn = (book.isbn ?? '').replace(/[^0-9Xx]/g, '')
  const q = isbn ? `isbn:${isbn}` : `intitle:${book.title} ${book.author ? `inauthor:${book.author}` : ''}`
  const params = new URLSearchParams({ q, country: 'IT', maxResults: '3' })
  if (process.env.GOOGLE_BOOKS_API_KEY) params.append('key', process.env.GOOGLE_BOOKS_API_KEY)
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const items = (await res.json()).items ?? []
    for (const it of items) {
      const p = it.saleInfo?.listPrice ?? it.saleInfo?.retailPrice
      if (p?.currencyCode === 'EUR' && typeof p.amount === 'number' && p.amount > 0) return Math.round(p.amount * 100) / 100
    }
  } catch {}
  return null
}

// ── 2. Annunci reali tramite ricerca web ────────────────────────────────────
interface FoundListing { platform?: string; price?: number; condition?: string; url?: string }

async function webListings(book: Book): Promise<{ listings: MarketSource[]; note?: string } | null> {
  if (!client) return null
  const desc = [
    `"${book.title}"`,
    book.author && `di ${book.author}`,
    book.publisher && `editore ${book.publisher}`,
    book.year && `anno ${book.year}`,
    book.edition && `edizione ${book.edition}`,
    book.isbn && `ISBN ${book.isbn}`,
  ].filter(Boolean).join(', ')

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 3,
        allowed_domains: Object.keys(PORTALS),
        user_location: { type: 'approximate', country: 'IT' },
      }],
      messages: [{
        role: 'user',
        content: `Trova i prezzi attuali del libro ${desc} su portali italiani di libri usati e da collezione (eBay, Vinted, Subito, AbeBooks, Maremagnum, Comprovendolibri, Libraccio, Catawiki; Amazon/IBS solo come prezzo del nuovo).
Fai al massimo 3 ricerche. Considera SOLO annunci di questo libro (stesso titolo e autore), non altri libri.
Rispondi alla fine SOLO con JSON valido, senza testo attorno:
{"listings":[{"platform":"eBay","price":12.5,"condition":"Usato - buono","url":"https://..."}],"note":"una frase su edizione/rarità se rilevante"}
Prezzi in euro, numero senza simbolo. Se non trovi annunci: {"listings":[]}.`,
      }],
    })

    const text = response.content.filter(b => b.type === 'text').map(b => (b as Anthropic.TextBlock).text).join('')
    const searches = response.content.filter(b => b.type === 'server_tool_use').length
    console.log('valuation', JSON.stringify({ title: book.title, searches, stop: response.stop_reason, text: text.slice(-1200) }))
    const match = text.match(/\{[\s\S]*\}\s*$/) ?? text.match(/\{[\s\S]*\}/)
    if (!match) return { listings: [] }
    const raw = JSON.parse(match[0]) as { listings?: FoundListing[]; note?: string }

    // Teniamo solo annunci credibili: prezzo sensato e link a un portale noto
    const listings: MarketSource[] = []
    const seen = new Set<string>()
    for (const l of raw.listings ?? []) {
      const price = Number(l.price)
      if (!l.url || !Number.isFinite(price) || price < 0.5 || price > 20000) continue
      const platform = platformOf(l.url)
      if (!platform || seen.has(l.url)) continue
      seen.add(l.url)
      listings.push({ platform, price: Math.round(price * 100) / 100, url: l.url, condition: l.condition?.slice(0, 40) || undefined })
    }
    return { listings: listings.slice(0, 8), note: raw.note?.slice(0, 200) || undefined }
  } catch (e) {
    console.error('webListings:', e instanceof Error ? e.message : e)
    return null
  }
}

// ── 3. Stima di riserva (età del libro) ─────────────────────────────────────
function ageEstimate(book: Book) {
  const age = new Date().getFullYear() - (book.year ?? 2000)
  const base = age > 60 ? 35 : age > 40 ? 22 : age > 20 ? 14 : 9
  const min = Math.max(3, Math.round(base * 0.6))
  const max = Math.round(base * 2.8)
  return { min, max, avg: Math.round((min + max) / 2) }
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export async function valueBook(book: Book): Promise<MarketData> {
  const [newPrice, web] = await Promise.all([coverPrice(book), webListings(book)])

  // Il prezzo del nuovo (Amazon/IBS) è un riferimento, non un valore dell'usato
  const used = (web?.listings ?? []).filter(l => l.platform !== 'Amazon' && l.platform !== 'IBS')
  const links = searchLinks(book).filter(s => !(web?.listings ?? []).some(l => l.platform === s.platform))

  if (used.length > 0) {
    const prices = used.map(l => l.price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(median(prices) * 100) / 100,
      currency: 'EUR',
      lastUpdated: new Date().toISOString(),
      method: 'annunci',
      found: used.length,
      newPrice,
      note: web?.note,
      sources: [...(web?.listings ?? []), ...links],
    }
  }

  const est = ageEstimate(book)
  return {
    ...est,
    currency: 'EUR',
    lastUpdated: new Date().toISOString(),
    method: 'stima',
    found: 0,
    newPrice,
    note: web?.note,
    sources: [...(web?.listings ?? []), ...searchLinks(book)],
  }
}
