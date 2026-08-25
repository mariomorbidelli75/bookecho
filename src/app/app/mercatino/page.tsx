'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, Store, Plus, BarChart3, MapPin, ChevronDown } from 'lucide-react'
import { MarketBookCard } from '@/components/MarketBookCard'
import type { Book } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { getMarketBooks } from '@/lib/storage'

type Tab = 'for-sale' | 'sold' | 'all'
type SearchField = 'all' | 'author' | 'publisher' | 'edition'

const TABS: { value: Tab; label: string }[] = [
  { value: 'for-sale', label: 'In vendita' },
  { value: 'sold', label: 'Venduti' },
  { value: 'all', label: 'Tutti' },
]

const SEARCH_FIELDS: { value: SearchField; label: string; placeholder: string }[] = [
  { value: 'all', label: 'Tutto', placeholder: 'Cerca titolo, autore, editore…' },
  { value: 'author', label: 'Autore', placeholder: 'Cerca per autore…' },
  { value: 'publisher', label: 'Casa editrice', placeholder: 'Cerca per casa editrice…' },
  { value: 'edition', label: 'Edizione', placeholder: 'Cerca per edizione o collana…' },
]

function fieldText(b: Book, field: SearchField): string {
  switch (field) {
    case 'author': return b.author ?? ''
    case 'publisher': return b.publisher ?? ''
    case 'edition': return b.edition ?? ''
    default:
      return [b.title, b.author, b.publisher, b.edition, b.isbn, b.location, b.genre]
        .filter(Boolean).join(' ')
  }
}

export default function MercatinoPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('for-sale')
  const [search, setSearch] = useState('')
  const [field, setField] = useState<SearchField>('all')
  const [location, setLocation] = useState('')
  const [showLocations, setShowLocations] = useState(false)

  useEffect(() => {
    setBooks(getMarketBooks())
    setLoading(false)
  }, [])

  // Posizioni distinte con conteggio, per il filtro "dove sono".
  const locations = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of books) {
      if (b.status === 'sold') continue
      const loc = b.location?.trim()
      if (loc) map.set(loc, (map.get(loc) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [books])

  const filtered = books.filter(b => {
    if (tab === 'for-sale' && b.status === 'sold') return false
    if (tab === 'sold' && b.status !== 'sold') return false
    if (location && (b.location ?? '').trim() !== location) return false
    if (search.trim() && !fieldText(b, field).toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  const forSale = books.filter(b => b.status !== 'sold')
  const soldBooks = books.filter(b => b.status === 'sold')
  const stockValue = forSale.reduce((s, b) => s + (b.listingPrice ?? 0), 0)
  const revenue = soldBooks.reduce((s, b) => s + (b.soldPrice ?? 0), 0)
  const placeholder = SEARCH_FIELDS.find(f => f.value === field)?.placeholder ?? ''

  return (
    <div>
      <div className="px-4 pt-8 pb-4" style={{ background: 'var(--cream)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">Il mio mercatino</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {forSale.length} in vendita · {soldBooks.length} venduti
            </p>
          </div>
          <Link
            href="/app/scan?dest=market"
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
          >
            <Plus size={20} />
          </Link>
        </div>

        {/* Riepilogo economico */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Valore in vendita</p>
            <p className="font-serif text-lg font-semibold text-[var(--ink)]">{formatPrice(stockValue)}</p>
          </div>
          <Link href="/app/mercatino/stats" className="p-3 rounded-2xl transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 flex items-center gap-1">
              <BarChart3 size={11} /> Incassato · cruscotto
            </p>
            <p className="font-serif text-lg font-semibold">{formatPrice(revenue)}</p>
          </Link>
        </div>

        {/* Ricerca */}
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        {/* Campo di ricerca */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-2">
          {SEARCH_FIELDS.map(f => (
            <button
              key={f.value}
              onClick={() => setField(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all',
                field === f.value ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]'
              )}
              style={field === f.value ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Stato */}
        <div className="flex gap-2 mb-2">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                tab === t.value ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]'
              )}
              style={tab === t.value ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtro posizione — dove ho messo i libri */}
        {locations.length > 0 && (
          <div>
            <button
              onClick={() => setShowLocations(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin size={16} style={{ color: 'var(--forest)' }} />
                {location || 'Filtra per posizione'}
              </span>
              <ChevronDown size={16} style={{ transform: showLocations ? 'rotate(180deg)' : 'none' }} />
            </button>
            {showLocations && (
              <div className="mt-2 p-3 rounded-2xl flex flex-wrap gap-1.5" style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
                <button
                  onClick={() => { setLocation(''); setShowLocations(false) }}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', !location ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]')}
                  style={!location ? { background: 'var(--forest)' } : { background: 'var(--cream)' }}
                >
                  Tutte
                </button>
                {locations.map(([loc, n]) => (
                  <button
                    key={loc}
                    onClick={() => { setLocation(loc); setShowLocations(false) }}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', location === loc ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]')}
                    style={location === loc ? { background: 'var(--forest)' } : { background: 'var(--cream)' }}
                  >
                    {loc} · {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Elenco */}
      <div className="px-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--cream-2)' }}>
              <Store size={28} className="text-[var(--muted)]" />
            </div>
            <h3 className="font-serif text-lg font-semibold mb-1">
              {books.length === 0 ? 'Mercatino vuoto' : 'Nessun libro trovato'}
            </h3>
            <p className="text-sm text-[var(--muted)] mb-6 max-w-xs">
              {books.length === 0
                ? 'Scansiona un libro e scegli “Mercatino” per metterlo in vendita.'
                : 'Prova a cambiare ricerca, stato o posizione.'}
            </p>
            {books.length === 0 && (
              <Link
                href="/app/scan?dest=market"
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-[var(--cream)] transition-all active:scale-95"
                style={{ background: 'var(--forest)' }}
              >
                Aggiungi un libro
              </Link>
            )}
          </div>
        ) : (
          filtered.map(book => <MarketBookCard key={book.id} book={book} />)
        )}
      </div>
    </div>
  )
}
