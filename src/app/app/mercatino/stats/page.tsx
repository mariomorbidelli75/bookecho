'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Trophy } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book } from '@/types'
import { formatDate, formatPrice } from '@/lib/utils'
import { getBooks } from '@/lib/storage'
import { computeSalesStats } from '@/lib/market'

type Range = 12 | 6 | 3

export default function MarketStatsPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>(12)

  useEffect(() => {
    setBooks(getBooks())
    setLoading(false)
  }, [])

  const stats = useMemo(() => computeSalesStats(books, range), [books, range])

  if (loading) return (
    <div className="p-4 space-y-3">
      <div className="skeleton h-28 rounded-3xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  )

  if (stats.count === 0) return (
    <div>
      <TopBar title="Guadagni" back />
      <div className="px-4 py-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--cream-2)' }}>
          <BarChart3 size={28} className="text-[var(--muted)]" />
        </div>
        <h2 className="font-serif text-lg font-semibold mb-1">Ancora nessuna vendita</h2>
        <p className="text-sm text-[var(--muted)] mb-6 max-w-xs">
          Registra la prima vendita dal mercatino: da lì in poi qui trovi incassi, guadagno e i luoghi dove vendi di più.
        </p>
        <Link
          href="/app/mercatino"
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-[var(--cream)] transition-all active:scale-95"
          style={{ background: 'var(--forest)' }}
        >
          Vai al mercatino
        </Link>
      </div>
    </div>
  )

  const maxChannel = Math.max(...stats.byChannel.map(c => c.revenue), 1)
  const maxMonth = Math.max(...stats.byMonth.map(m => m.revenue), 1)
  const peakMonth = stats.byMonth.reduce((a, b) => (b.revenue > a.revenue ? b : a), stats.byMonth[0])

  return (
    <div>
      <TopBar title="Guadagni" back />

      <div className="px-4 py-4 space-y-4">
        {/* Numero principale */}
        <div className="p-5 rounded-3xl" style={{ background: 'var(--forest-darker)', color: 'var(--cream)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Incasso totale</p>
          <p className="font-serif text-4xl font-semibold leading-tight mt-1">{formatPrice(stats.revenue)}</p>
          <p className="text-sm opacity-80 mt-1">
            {stats.count} {stats.count === 1 ? 'libro venduto' : 'libri venduti'}
            {stats.cost > 0 ? ` · guadagno netto ${formatPrice(stats.profit)}` : ''}
          </p>
        </div>

        {/* Tessere */}
        <div className="grid grid-cols-3 gap-2">
          <Tile label="Prezzo medio" value={formatPrice(stats.avgPrice)} />
          <Tile label="Costo acquisti" value={formatPrice(stats.cost)} />
          <Tile label="In vendita" value={`${stats.forSaleCount}`} sub={formatPrice(stats.forSaleValue)} />
        </div>

        {/* Dove vendo di più */}
        {stats.bestChannel && (
          <div className="p-4 rounded-2xl flex items-center gap-3" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
            <Trophy size={22} className="flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Dove vendi di più</p>
              <p className="font-serif text-lg font-semibold leading-tight">{stats.bestChannel.channel}</p>
              <p className="text-xs opacity-80">
                {formatPrice(stats.bestChannel.revenue)} · {stats.bestChannel.count} {stats.bestChannel.count === 1 ? 'libro' : 'libri'}
              </p>
            </div>
          </div>
        )}

        {/* Incasso per canale — barre orizzontali, una sola tinta (grandezza) */}
        <section>
          <h2 className="font-serif text-base font-semibold mb-1">Incasso per luogo di vendita</h2>
          <p className="text-xs text-[var(--muted)] mb-3">Quanto hai incassato in ogni canale, dal più redditizio.</p>
          <div className="space-y-2.5">
            {stats.byChannel.map(c => (
              <div key={c.channel}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--ink)] truncate">{c.channel}</span>
                  <span className="text-sm font-semibold text-[var(--forest)] flex-shrink-0">{formatPrice(c.revenue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--cream-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(4, (c.revenue / maxChannel) * 100)}%`, background: 'var(--forest)' }}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--muted)] w-14 text-right flex-shrink-0">
                    {c.count} {c.count === 1 ? 'libro' : 'libri'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Andamento mensile */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-serif text-base font-semibold">Andamento incassi</h2>
            <div className="flex gap-1">
              {([3, 6, 12] as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2 py-1 rounded-full text-[11px] font-semibold transition-all"
                  style={range === r
                    ? { background: 'var(--forest)', color: 'var(--cream)' }
                    : { background: 'var(--cream-2)', color: 'var(--muted)' }}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-[var(--muted)] mb-3">
            Picco: {peakMonth.revenue > 0 ? `${peakMonth.label} ${peakMonth.year} · ${formatPrice(peakMonth.revenue)}` : 'nessuna vendita nel periodo'}
          </p>

          <div className="p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <div className="flex items-end gap-1.5" style={{ height: 132 }}>
              {stats.byMonth.map(m => {
                const h = (m.revenue / maxMonth) * 100
                const isPeak = m.revenue > 0 && m.key === peakMonth.key
                return (
                  <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${m.label} ${m.year}: ${formatPrice(m.revenue)}`}>
                    {isPeak && (
                      <span className="text-[9px] font-semibold whitespace-nowrap" style={{ color: 'var(--forest)' }}>
                        {Math.round(m.revenue)}€
                      </span>
                    )}
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max(m.revenue > 0 ? 6 : 2, h)}%`,
                        background: m.revenue > 0 ? 'var(--forest)' : 'var(--cream-3)',
                        borderRadius: '4px 4px 2px 2px',
                      }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {stats.byMonth.map(m => (
                <span key={m.key} className="flex-1 text-center text-[9px] text-[var(--muted)]">{m.label}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Elenco vendite — la stessa informazione in forma tabellare */}
        <section>
          <h2 className="font-serif text-base font-semibold mb-2 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: 'var(--forest)' }} /> Storico vendite
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {stats.soldBooks.map((b, i) => (
              <Link
                key={b.id}
                href={b.collection === 'market' ? `/app/mercatino/${b.id}` : `/app/book/${b.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors"
                style={{ background: i % 2 ? 'var(--cream-2)' : 'var(--cream)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">{b.title}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">
                    {[b.soldChannel ?? 'Luogo non indicato', b.soldAt ? formatDate(b.soldAt) : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--forest)] flex-shrink-0">
                  {b.soldPrice != null ? formatPrice(b.soldPrice) : '—'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] leading-tight">{label}</p>
      <p className="font-serif text-base font-semibold text-[var(--ink)] mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-[var(--muted)]">{sub}</p>}
    </div>
  )
}
