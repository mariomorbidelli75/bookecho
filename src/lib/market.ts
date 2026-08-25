import type { Book } from '@/types'

// Statistiche di vendita del mercatino.
// Vengono conteggiati TUTTI i libri con stato 'sold', sia quelli venduti dal
// mercatino sia quelli scaricati dalla libreria personale: l'incasso è incasso.

// Finestra temporale del cruscotto, in mesi ('all' = da sempre).
export type SalesPeriod = 3 | 6 | 12 | 'all'

// Le tre dimensioni con cui si guarda "cosa vende di più".
export type Dimension = 'genre' | 'author' | 'publisher'

// Metrica del grafico a torta: incasso in euro o numero di copie.
export type Metric = 'revenue' | 'count'

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

// Un raggruppamento (un genere, un autore, una casa editrice).
export interface GroupStat {
  key: string
  revenue: number
  count: number
  cost: number
  // Quanti libri del gruppo hanno il prezzo d'acquisto registrato: senza quello
  // il guadagno non è calcolabile e va detto, non stimato.
  withCost: number
  // Guadagno reale, calcolato solo sui libri con prezzo d'acquisto noto.
  profit: number
  avgPrice: number
  // Vero solo per la voce di coda "Altri N" del grafico.
  isOther?: boolean
}

export interface SalesStats {
  soldBooks: Book[]
  count: number
  revenue: number
  avgPrice: number
  // ── Guadagno reale ────────────────────────────────────────────────────────
  cost: number             // somma dei prezzi d'acquisto noti
  withCost: number         // libri venduti con prezzo d'acquisto registrato
  coveredRevenue: number   // incasso dei soli libri con costo noto
  profit: number           // coveredRevenue − cost
  margin: number           // profit / coveredRevenue (0 se non calcolabile)
  uncoveredRevenue: number // incasso dei libri senza prezzo d'acquisto
  // ── Ripartizioni ──────────────────────────────────────────────────────────
  byChannel: ChannelStat[]
  byMonth: MonthStat[]
  bestChannel: ChannelStat | null
  byGenre: GroupStat[]
  byAuthor: GroupStat[]
  byPublisher: GroupStat[]
  // ── Magazzino ancora in vendita (non dipende dal periodo) ─────────────────
  forSaleCount: number
  forSaleValue: number
}

const MONTH_LABELS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

const NO_CHANNEL = 'Non indicato'
export const NO_VALUE = 'Non indicato'

// Etichette delle tre dimensioni, usate nelle intestazioni del cruscotto.
export const DIMENSION_LABELS: Record<Dimension, { tab: string; one: string; many: string }> = {
  genre: { tab: 'Genere', one: 'genere', many: 'generi' },
  author: { tab: 'Autore', one: 'autore', many: 'autori' },
  publisher: { tab: 'Editore', one: 'casa editrice', many: 'case editrici' },
}

export const PERIOD_LABELS: Record<string, string> = {
  '3': 'Ultimi 3 mesi',
  '6': 'Ultimi 6 mesi',
  '12': 'Ultimi 12 mesi',
  all: 'Da sempre',
}

function saleDate(b: Book): Date {
  return new Date(b.soldAt ?? b.updatedAt)
}

// Primo giorno del periodo: 'all' non taglia nulla.
export function periodStart(period: SalesPeriod, now = new Date()): Date | null {
  if (period === 'all') return null
  const d = new Date(now.getFullYear(), now.getMonth() - (period - 1), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

function dimensionValue(b: Book, dim: Dimension): string {
  const raw = dim === 'genre' ? b.genre : dim === 'publisher' ? b.publisher : b.author
  const value = raw?.trim()
  return value ? value : NO_VALUE
}

// Raggruppa le vendite per genere / autore / editore, dalla più redditizia.
export function groupSales(sold: Book[], dim: Dimension): GroupStat[] {
  const map = new Map<string, GroupStat>()
  for (const b of sold) {
    const key = dimensionValue(b, dim)
    const g = map.get(key) ?? { key, revenue: 0, count: 0, cost: 0, withCost: 0, profit: 0, avgPrice: 0 }
    const price = b.soldPrice ?? 0
    g.revenue += price
    g.count += 1
    if (b.purchasePrice != null) {
      g.cost += b.purchasePrice
      g.withCost += 1
      g.profit += price - b.purchasePrice
    }
    map.set(key, g)
  }
  for (const g of map.values()) g.avgPrice = g.count > 0 ? g.revenue / g.count : 0
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count)
}

// Top N per la metrica scelta; tutto il resto confluisce in "Altri", così il
// grafico resta leggibile e nessuna vendita sparisce dal totale.
export function topWithOther(groups: GroupStat[], metric: Metric, max = 5): GroupStat[] {
  const sorted = [...groups].sort((a, b) => b[metric] - a[metric] || b.revenue - a.revenue)
  if (sorted.length <= max + 1) return sorted
  const head = sorted.slice(0, max)
  const tail = sorted.slice(max)
  const other = tail.reduce<GroupStat>((acc, g) => ({
    key: `Altri ${tail.length}`,
    revenue: acc.revenue + g.revenue,
    count: acc.count + g.count,
    cost: acc.cost + g.cost,
    withCost: acc.withCost + g.withCost,
    profit: acc.profit + g.profit,
    avgPrice: 0,
    isOther: true,
  }), { key: '', revenue: 0, count: 0, cost: 0, withCost: 0, profit: 0, avgPrice: 0, isOther: true })
  other.avgPrice = other.count > 0 ? other.revenue / other.count : 0
  return [...head, other]
}

export function computeSalesStats(books: Book[], period: SalesPeriod = 12, now = new Date()): SalesStats {
  const from = periodStart(period, now)
  const sold = books
    .filter(b => b.status === 'sold')
    .filter(b => (from ? saleDate(b).getTime() >= from.getTime() : true))
    .sort((a, b) => saleDate(b).getTime() - saleDate(a).getTime())

  const revenue = sold.reduce((s, b) => s + (b.soldPrice ?? 0), 0)
  const withPrice = sold.filter(b => b.soldPrice != null).length

  // ── Guadagno reale: solo dove il prezzo d'acquisto è noto ─────────────────
  const covered = sold.filter(b => b.purchasePrice != null)
  const cost = covered.reduce((s, b) => s + (b.purchasePrice ?? 0), 0)
  const coveredRevenue = covered.reduce((s, b) => s + (b.soldPrice ?? 0), 0)
  const profit = coveredRevenue - cost

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

  // ── Incasso per mese (anche i mesi vuoti) ─────────────────────────────────
  // Con 'all' l'andamento resta sugli ultimi 12 mesi: i totali sopra sono di
  // tutta la storia, il grafico dice come sta andando adesso.
  const monthsBack = period === 'all' ? 12 : period
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
    avgPrice: withPrice > 0 ? revenue / withPrice : 0,
    cost,
    withCost: covered.length,
    coveredRevenue,
    profit,
    margin: coveredRevenue > 0 ? profit / coveredRevenue : 0,
    uncoveredRevenue: revenue - coveredRevenue,
    byChannel,
    byMonth,
    bestChannel: byChannel[0] ?? null,
    byGenre: groupSales(sold, 'genre'),
    byAuthor: groupSales(sold, 'author'),
    byPublisher: groupSales(sold, 'publisher'),
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
