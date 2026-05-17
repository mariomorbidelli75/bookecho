'use client'
import { useState, useEffect } from 'react'
import { Search, BookOpen, Plus } from 'lucide-react'
import Link from 'next/link'
import { BookCard } from '@/components/BookCard'
import type { Book, BookStatus } from '@/types'
import { cn } from '@/lib/utils'
import { getBooks } from '@/lib/storage'

const FILTERS: { value: BookStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: 'read', label: 'Letti' },
  { value: 'reading', label: 'In lettura' },
  { value: 'wishlist', label: 'Lista desideri' },
]

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [filter, setFilter] = useState<BookStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setBooks(getBooks())
    setLoading(false)
  }, [])

  const filtered = books.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (search && !b.title.toLowerCase().includes(search.toLowerCase()) && !b.author.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-14 pb-4" style={{ background: 'var(--cream)' }}>
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
              onClick={() => setFilter(f.value)}
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
            <p className="text-sm text-[var(--muted)] mb-6">Scansiona la copertina di un libro per iniziare</p>
            <Link
              href="/app/scan"
              className="px-5 py-2.5 rounded-full text-sm font-semibold text-[var(--cream)] transition-all active:scale-95"
              style={{ background: 'var(--forest)' }}
            >
              Scansiona un libro
            </Link>
          </div>
        ) : (
          filtered.map(book => <BookCard key={book.id} book={book} />)
        )}
      </div>
    </div>
  )
}
