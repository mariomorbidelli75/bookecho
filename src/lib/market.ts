import type { Book } from '@/types'

// Statistiche di vendita del mercatino.
// Vengono conteggiati TUTTI i libri con stato 'sold', sia quelli venduti dal
// mercatino sia quelli scaricati dalla libreria personale: l'incasso è incasso.

export interface ChannelStat {
  channel: string
  revenue: number
  count: number
}

export interface MonthStat {
  key: string      // '2026-08'
  label: string    // 'ago'
  year: number
  revenue: number
  count: number
}

export interface SalesStats {
  soldBooks: Book[]
  count: number
  revenue: number
  cost: number
  profit: number
  avgPrice: number
  byChannel: ChannelStat[]
  byMonth: MonthStat[]
  bestChannel: ChannelStat | null
  // Magazzino ancora in vendita
  forSaleCount: number
  forSaleValue: number
}

const MONTH_LABELS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

const NO_CHANNEL = 'Non indicato'

function saleDate(b: Book): Date {
  return new Date(b.soldAt ?? b.updatedAt)
}

export function computeSalesStats(books: Book[], monthsBack = 12): SalesStats {
  const sold = books
    .filter(b => b.status === 'sold')
    .sort((a, b) => saleDate(b).getTime() - saleDate(a).getTime())

  const revenue = sold.reduce((s, b) => s + (b.soldPrice ?? 0), 0)
  const cost = sold.reduce((s, b) => s + (b.purchasePrice ?? 0), 0)
  const withPrice = sold.filter(b => b.soldPrice != null).length

  // ── Incasso per canale ────────────────────────────────────────────────────
  const channelMap = new Map<string, ChannelStat>()
  for (const b of sold) {
    const channel = b.soldChannel?.trim() || NO_CHANNEL
    const entry = channelMap.get(channel) ?? { channel, revenue: 0, count: 0 }
    entry.revenue += b.soldPrice ?? 0
    entry.count += 1
    channelMap.set(channel, entry)
  }
  const byChannel = [...channelMap.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count)

  // ── Incasso per mese (ultimi N mesi, anche quelli vuoti) ──────────────────
  const now = new Date()
  const byMonth: MonthStat[] = []
  const index = new Map<string, MonthStat>()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const stat: MonthStat = { key, label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), revenue: 0, count: 0 }
    byMonth.push(stat)
    index.set(key, stat)
  }
  for (const b of sold) {
    const d = saleDate(b)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const stat = index.get(key)
    if (stat) {
      stat.revenue += b.soldPrice ?? 0
      stat.count += 1
    }
  }

  const forSale = books.filter(b => b.status === 'for-sale')

  return {
    soldBooks: sold,
    count: sold.length,
    revenue,
    cost,
    profit: revenue - cost,
    avgPrice: withPrice > 0 ? revenue / withPrice : 0,
    byChannel,
    byMonth,
    bestChannel: byChannel[0] ?? null,
    forSaleCount: forSale.length,
    forSaleValue: forSale.reduce((s, b) => s + (b.listingPrice ?? 0), 0),
  }
}

// Testo di ricerca del mercatino: titolo, autore, editore, edizione, ISBN e posizione.
export function marketSearchIndex(b: Book): string {
  return [b.title, b.author, b.publisher, b.edition, b.isbn, b.location, b.genre]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
