'use client'
import { useState, useEffect } from 'react'
import { Search, BookOpen, Plus, CalendarRange, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { BookCard } from '@/components/BookCard'
import type { Book, BookStatus } from '@/types'
import { cn } from '@/lib/utils'
import { getBooks } from '@/lib/storage'

const FILTERS: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'read', label: 'Letti' },
  { value: 'reading', label: 'In lettura' },
  { value: 'to-read', label: 'Da leggere' },
  { value: 'wishlist', label: 'Lista desideri' },
]

// La data in cui un libro è stato "letto": fine lettura se presente, altrimenti
// la data di aggiunta in libreria.
function readDate(b: Book): string {
  return b.readingFinishedAt ?? b.createdAt
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return ymd(d)
}

type Preset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

const PRESETS: { value: Preset; label: string; from: () => string; to: () => string }[] = [
  { value: 'today', label: 'Oggi', from: () => daysAgo(0), to: () => ymd(new Date()) },
  { value: 'week', label: 'Settimana', from: () => daysAgo(6), to: () => ymd(new Date()) },
  { value: 'month', label: 'Mese', from: () => daysAgo(29), to: () => ymd(new Date()) },
  { value: 'year', label: 'Anno', from: () => daysAgo(364), to: () => ymd(new Date()) },
  { value: 'all', label: 'Sempre', from: () => '', to: () => '' },
]

function inRange(iso: string, from: string, to: string): boolean {
  const t = new Date(iso).getTime()
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false
  if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
  return true
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [filter, setFilter] = useState<BookStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Filtro periodo (attivo solo nella vista "Letti")
  const [showPeriod, setShowPeriod] = useState(false)
  const [preset, setPreset] = useState<Preset>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    setBooks(getBooks())
    setLoading(false)
  }, [])

  const applyPreset = (p: Preset) => {
    setPreset(p)
    const def = PRESETS.find(x => x.value === p)
    if (def) { setFrom(def.from()); setTo(def.to()) }
  }

  const periodActive = filter === 'read' && (!!from || !!to)

  const filtered = books.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (periodActive && !inRange(readDate(b), from, to)) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const periodCount = books.filter(b => b.status === 'read' && (!periodActive || inRange(readDate(b), from, to))).length

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-8 pb-4" style={{ background: 'var(--cream)' }}>
        {/* Logo Librò centrato in alto */}
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Librò" width={120} height={107} priority className="h-12 w-auto object-contain" />
        </div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">La mia libreria</h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">{books.length} libri · {books.filter(b => b.status === 'read').length} letti</p>
          </div>
          <Link
            href="/app/scan"
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm transition-all active:scale-95"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
          >
            <Plus size={20} />
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca titolo o autore…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => {
                setFilter(f.value)
                if (f.value !== 'read') setShowPeriod(false)
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all',
                filter === f.value
                  ? 'text-[var(--cream)]'
                  : 'text-[var(--muted)] border border-[var(--line)]'
              )}
              style={filter === f.value ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Period dropdown — solo nella vista "Letti" */}
        {filter === 'read' && (
          <div className="mt-3">
            <button
              onClick={() => setShowPeriod(v => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <span className="flex items-center gap-2">
                <CalendarRange size={16} style={{ color: 'var(--forest)' }} />
                {periodActive
                  ? `${periodCount} letti${preset !== 'custom' ? ` · ${PRESETS.find(p => p.value === preset)?.label ?? ''}` : ' nel periodo'}`
                  : 'Filtra per periodo'}
              </span>
              <ChevronDown size={16} className="transition-transform" style={{ transform: showPeriod ? 'rotate(180deg)' : 'none' }} />
            </button>

            {showPeriod && (
              <div className="mt-2 p-3 rounded-2xl space-y-3" style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
                {/* Preset rapidi */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => applyPreset(p.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                        preset === p.value ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]'
                      )}
                      style={preset === p.value ? { background: 'var(--forest)' } : { background: 'var(--cream)' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Intervallo personalizzato */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">Dal giorno</span>
                    <input
                      type="date"
                      value={from}
                      max={to || undefined}
                      onChange={e => { setFrom(e.target.value); setPreset('custom') }}
                      className="px-3 py-2 rounded-xl text-sm text-[var(--ink)] outline-none"
                      style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[var(--muted)]">Al giorno</span>
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={e => { setTo(e.target.value); setPreset('custom') }}
                      className="px-3 py-2 rounded-xl text-sm text-[var(--ink)] outline-none"
                      style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
                    />
                  </label>
                </div>

                {/* Riepilogo */}
                <div className="flex items-center justify-between pt-1">
                  <span className="font-serif text-sm font-semibold" style={{ color: 'var(--forest)' }}>
                    {periodCount} {periodCount === 1 ? 'libro letto' : 'libri letti'}
                  </span>
                  {periodActive && (
                    <button
                      onClick={() => { setFrom(''); setTo(''); setPreset('all') }}
                      className="text-xs font-semibold text-[var(--muted)] underline"
                    >
                      Azzera
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Book list */}
      <div className="px-4 space-y-2.5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--cream-2)' }}>
              <BookOpen size={28} className="text-[var(--muted)]" />
            </div>
            <h3 className="font-serif text-lg font-semibold mb-1">Nessun libro trovato</h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              {periodActive ? 'Nessun libro letto in questo periodo' : 'Scansiona la copertina di un libro per iniziare'}
            </p>
            {!periodActive && (
              <Link
                href="/app/scan"
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-[var(--cream)] transition-all active:scale-95"
                style={{ background: 'var(--forest)' }}
              >
                Scansiona un libro
              </Link>
            )}
          </div>
        ) : (
          filtered.map(book => <BookCard key={book.id} book={book} />)
        )}
      </div>
    </div>
  )
}
