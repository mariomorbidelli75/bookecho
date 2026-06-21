'use client'
import { useState, useEffect } from 'react'
import { BookOpen, Star, TrendingUp, Zap, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book } from '@/types'
import { formatPrice } from '@/lib/utils'
import { getBooks } from '@/lib/storage'

export default function ProfilePage() {
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    setBooks(getBooks())
  }, [])

  const read = books.filter(b => b.status === 'read')
  const avgRating = read.filter(b => b.rating).reduce((a, b) => a + (b.rating ?? 0), 0) / (read.filter(b => b.rating).length || 1)
  const totalValue = books.reduce((a, b) => a + (b.marketData?.avg ?? 0), 0)
  const topEmotion = (() => {
    const count: Record<string, number> = {}
    books.flatMap(b => b.emotions ?? []).forEach(e => { count[e] = (count[e] ?? 0) + 1 })
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0]
  })()

  const STATS = [
    { icon: BookOpen, label: 'Libri letti', value: read.length, color: 'var(--forest)' },
    { icon: Star, label: 'Media voto', value: avgRating.toFixed(1), color: 'var(--accent-amber)' },
    { icon: TrendingUp, label: 'Valore totale', value: formatPrice(totalValue), color: '#4A8B6F' },
    { icon: Zap, label: 'Emozione top', value: topEmotion ?? '—', color: '#9B59B6' },
  ]

  return (
    <div>
      <TopBar title="Profilo" />
      <div className="px-4 py-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-serif text-2xl font-bold" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            M
          </div>
          <div>
            <h2 className="font-serif text-lg font-semibold">Mario</h2>
            <p className="text-sm text-[var(--muted)]">Collezionista di libri</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STATS.map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <s.icon size={18} style={{ color: s.color }} />
              <p className="font-serif text-xl font-semibold mt-2 leading-none">{s.value}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl overflow-hidden border border-[var(--line)]">
          {[
            { label: 'Libri in archivio', desc: `${books.length} libri salvati` },
            { label: 'Archiviazione', desc: 'Locale (questo dispositivo)' },
            { label: 'Librò', desc: 'tutti i libri in un posto solo · v1.0' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--line)] last:border-none" style={{ background: 'white' }}>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted)]">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
