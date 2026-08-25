'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Trophy, Info } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { DonutChart, type DonutSlice } from '@/components/DonutChart'
import type { Book } from '@/types'
import { formatDate, formatPrice } from '@/lib/utils'
import { getBooks } from '@/lib/storage'
import {
  computeSalesStats, topWithOther, DIMENSION_LABELS, PERIOD_LABELS,
  type SalesPeriod, type Dimension, type Metric, type GroupStat,
} from '@/lib/market'

// Palette dei grafici: tinte di identità (nessun significato di grandezza),
// verificate sul crema dell'app con lo script del metodo dataviz — banda di
// luminosità, croma, separazione per daltonismo e visione normale tutte OK.
// L'ordine è fisso: chi sta più in alto nella classifica prende lo slot 1.
const SERIES = ['#1F8A5B', '#E08A2E', '#0F7EAE', '#D1483B', '#7A5AC7']
// "Altri" è volutamente neutro: non è una categoria, è la coda.
const OTHER = '#8A8579'

const PERIODS: SalesPeriod[] = [3, 6, 12, 'all']
const DIMENSIONS: Dimension[] = ['genre', 'author', 'publisher']

export default function MarketStatsPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<SalesPeriod>(12)
  const [dim, setDim] = useState<Dimension>('genre')
  const [metric, setMetric] = useState<Metric>('revenue')
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    setBooks(getBooks())
    setLoading(false)
  }, [])

  const stats = useMemo(() => computeSalesStats(books, period), [books, period])
  const groups = dim === 'genre' ? stats.byGenre : dim === 'author' ? stats.byAuthor : stats.byPublisher
  const ranked = useMemo(() => topWithOther(groups, metric), [groups, metric])

  // Cambiando taglio o periodo la voce scelta può non esistere più: in quel
  // caso la selezione decade da sola, senza bisogno di azzerarla a mano.
  const selected = picked !== null && ranked.some(g => g.key === picked) ? picked : null
  const setSelected = setPicked
  const totalSold = books.filter(b => b.status === 'sold').length

  const slices: DonutSlice[] = ranked
    .map((g, i) => ({
      key: g.key,
      label: g.key,
      value: metric === 'revenue' ? g.revenue : g.count,
      color: g.isOther ? OTHER : SERIES[i % SERIES.length],
    }))
    .filter(s => s.value > 0)

  const sliceTotal = slices.reduce((s, x) => s + x.value, 0)
  const chosen = ranked.find(g => g.key === selected) ?? null
  const chosenValue = chosen ? (metric === 'revenue' ? chosen.revenue : chosen.count) : 0
  const maxRow = Math.max(...slices.map(s => s.value), 1)
  const words = DIMENSION_LABELS[dim]

  if (loading) return (
    <div className="p-4 space-y-3">
      <div className="skeleton h-28 rounded-3xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  )

  if (totalSold === 0) return (
    <div>
      <TopBar title="Cruscotto vendite" back />
      <div className="px-4 py-16 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--cream-2)' }}>
          <BarChart3 size={28} className="text-[var(--muted)]" />
        </div>
        <h2 className="font-serif text-lg font-semibold mb-1">Ancora nessuna vendita</h2>
        <p className="text-sm text-[var(--muted)] mb-6 max-w-xs">
          Registra la prima vendita dal mercatino: da lì in poi qui trovi incassi, guadagno reale
          e quali generi, autori ed editori vendono di più.
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
  const costShare = stats.coveredRevenue > 0 ? (stats.cost / stats.coveredRevenue) * 100 : 0

  return (
    <div>
      <TopBar title="Cruscotto vendite" back />

      <div className="px-4 py-4 space-y-5">
        {/* Periodo: un'unica riga di filtri, vale per tutto il cruscotto */}
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <button
              key={String(p)}
              onClick={() => setPeriod(p)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={period === p
                ? { background: 'var(--forest)', color: 'var(--cream)' }
                : { background: 'var(--cream-2)', color: 'var(--muted)' }}
            >
              {p === 'all' ? 'Tutto' : `${p}m`}
            </button>
          ))}
        </div>

        {stats.count === 0 ? (
          <div className="px-4 py-10 text-center rounded-3xl" style={{ background: 'var(--cream-2)' }}>
            <p className="font-serif text-base font-semibold mb-1">Nessuna vendita nel periodo</p>
            <p className="text-sm text-[var(--muted)]">
              {PERIOD_LABELS[String(period)]}: nessun libro venduto. Allarga il periodo per vedere lo storico.
            </p>
          </div>
        ) : (
          <>
            {/* Fatturato del periodo */}
            <div className="p-5 rounded-3xl" style={{ background: 'var(--forest-darker)', color: 'var(--cream)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Fatturato · {PERIOD_LABELS[String(period)].toLowerCase()}
              </p>
              <p className="font-serif text-4xl font-semibold leading-tight mt-1">{formatPrice(stats.revenue)}</p>
              <p className="text-sm opacity-80 mt-1">
                {stats.count} {stats.count === 1 ? 'libro venduto' : 'libri venduti'} · prezzo medio {formatPrice(stats.avgPrice)}
              </p>
            </div>

            {/* Guadagno reale: incasso meno quanto erano costati */}
            <section>
              <h2 className="font-serif text-base font-semibold mb-1">Guadagno reale</h2>
              <p className="text-xs text-[var(--muted)] mb-3">
                Differenza tra quanto hai incassato e quanto avevi speso per comprarli.
              </p>

              {stats.withCost === 0 ? (
                <div className="p-4 rounded-2xl flex items-start gap-2.5" style={{ background: 'var(--cream-2)' }}>
                  <Info size={16} className="flex-shrink-0 mt-0.5 text-[var(--muted)]" />
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                    Nessuno dei libri venduti ha il prezzo d&apos;acquisto registrato, quindi il guadagno non è
                    calcolabile. Compilalo nella scheda del libro (campo <span className="font-medium">Prezzo d&apos;acquisto</span>)
                    e comparirà qui.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-serif text-3xl font-semibold" style={{ color: stats.profit >= 0 ? '#1F8A5B' : '#D1483B' }}>
                      {stats.profit >= 0 ? '+' : ''}{formatPrice(stats.profit)}
                    </span>
                    <span className="text-sm font-semibold text-[var(--muted)]">
                      margine {Math.round(stats.margin * 100)}%
                    </span>
                  </div>

                  {/* Come si divide l'incasso dei libri con costo noto */}
                  {stats.profit >= 0 && (
                    <div className="flex h-2.5 rounded-full overflow-hidden mt-3" style={{ gap: 2 }}>
                      <div style={{ width: `${costShare}%`, background: 'var(--cream-4)' }} />
                      <div style={{ width: `${100 - costShare}%`, background: '#1F8A5B' }} />
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] mt-1.5 text-[var(--muted)]">
                    <span>Speso {formatPrice(stats.cost)}</span>
                    <span>Incassato {formatPrice(stats.coveredRevenue)}</span>
                  </div>

                  <p className="text-[11px] text-[var(--muted)] mt-2 leading-snug">
                    {`Calcolato su ${stats.withCost} ${stats.withCost === 1 ? 'libro' : 'libri'} con prezzo d'acquisto registrato`}
                    {stats.count > stats.withCost
                      ? ` · altri ${stats.count - stats.withCost} senza costo, ${formatPrice(stats.uncoveredRevenue)} di incasso non conteggiati qui.`
                      : '.'}
                  </p>
                </div>
              )}
            </section>

            {/* Tessere di contorno */}
            <div className="grid grid-cols-3 gap-2">
              <Tile label="Libri venduti" value={`${stats.count}`} />
              <Tile label="Prezzo medio" value={formatPrice(stats.avgPrice)} />
              <Tile label="In vendita" value={`${stats.forSaleCount}`} sub={formatPrice(stats.forSaleValue)} />
            </div>

            {/* ── Cosa vende di più ──────────────────────────────────────── */}
            <section>
              <h2 className="font-serif text-base font-semibold mb-1">Cosa vendi di più</h2>
              <p className="text-xs text-[var(--muted)] mb-3">
                Le vendite del periodo divise per {words.one}. Tocca uno spicchio per isolarlo.
              </p>

              {/* Taglio: genere / autore / editore */}
              <div className="flex p-1 rounded-2xl gap-1 mb-2" style={{ background: 'var(--cream-2)' }}>
                {DIMENSIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDim(d)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={dim === d
                      ? { background: 'var(--forest)', color: 'var(--cream)' }
                      : { color: 'var(--muted)' }}
                  >
                    {DIMENSION_LABELS[d].tab}
                  </button>
                ))}
              </div>

              {/* Metrica: euro incassati o numero di copie */}
              <div className="flex gap-1.5 mb-4">
                {([
                  { value: 'revenue' as Metric, label: '€ incassati' },
                  { value: 'count' as Metric, label: 'copie vendute' },
                ]).map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMetric(m.value)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
                    style={metric === m.value
                      ? { background: 'var(--ink)', color: 'var(--cream)' }
                      : { background: 'var(--cream-2)', color: 'var(--muted)' }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {sliceTotal === 0 ? (
                <div className="p-4 rounded-2xl flex items-start gap-2.5" style={{ background: 'var(--cream-2)' }}>
                  <Info size={16} className="flex-shrink-0 mt-0.5 text-[var(--muted)]" />
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                    I libri venduti nel periodo non hanno un prezzo di vendita registrato: passa a
                    &quot;copie vendute&quot; per vedere comunque la ripartizione.
                  </p>
                </div>
              ) : (
              <div className="flex justify-center mb-4">
                <DonutChart
                  slices={slices}
                  selected={selected}
                  onSelect={setSelected}
                  centerLabel={chosen ? chosen.key : `${slices.length} ${slices.length === 1 ? words.one : words.many}`}
                  centerValue={chosen
                    ? (metric === 'revenue' ? formatPrice(chosenValue) : `${chosenValue}`)
                    : (metric === 'revenue' ? formatPrice(sliceTotal) : `${sliceTotal}`)}
                  centerSub={chosen
                    ? `${sliceTotal > 0 ? Math.round((chosenValue / sliceTotal) * 100) : 0}% del totale`
                    : metric === 'revenue' ? 'incasso del periodo' : 'copie vendute'}
                  ariaLabel={`Vendite per ${words.one}: ${slices.map(s => `${s.label} ${metric === 'revenue' ? formatPrice(s.value) : `${s.value} copie`}`).join(', ')}`}
                />
              </div>
              )}

              {/* Legenda e classifica insieme: i numeri stanno qui, non sugli spicchi */}
              <div className="space-y-2.5">
                {slices.map((s, i) => {
                  const g = ranked.find(r => r.key === s.key) as GroupStat
                  const share = sliceTotal > 0 ? (s.value / sliceTotal) * 100 : 0
                  const dimmed = selected !== null && selected !== s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSelected(selected === s.key ? null : s.key)}
                      className="w-full text-left transition-opacity"
                      style={{ opacity: dimmed ? 0.45 : 1 }}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                          <span className="text-sm font-medium text-[var(--ink)] truncate">
                            {i + 1}. {s.label}
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-[var(--ink)] flex-shrink-0">
                          {metric === 'revenue' ? formatPrice(s.value) : `${s.value} ${s.value === 1 ? 'copia' : 'copie'}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--cream-2)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.max(4, (s.value / maxRow) * 100)}%`, background: s.color }} />
                        </div>
                        <span className="text-[11px] text-[var(--muted)] w-10 text-right flex-shrink-0">
                          {Math.round(share)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted)] mt-1">
                        {metric === 'revenue'
                          ? `${g.count} ${g.count === 1 ? 'copia' : 'copie'} · medio ${formatPrice(g.avgPrice)}`
                          : `${formatPrice(g.revenue)} · medio ${formatPrice(g.avgPrice)}`}
                        {g.withCost > 0 ? ` · guadagno ${g.profit >= 0 ? '+' : ''}${formatPrice(g.profit)}` : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            </section>

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
              <h2 className="font-serif text-base font-semibold mb-1">Andamento incassi</h2>
              <p className="text-xs text-[var(--muted)] mb-3">
                {period === 'all' ? 'Ultimi 12 mesi · ' : ''}
                Picco: {peakMonth.revenue > 0 ? `${peakMonth.label} ${peakMonth.year} · ${formatPrice(peakMonth.revenue)}` : 'nessuna vendita nel periodo'}
              </p>

              <div className="p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                <div className="flex items-end gap-1.5" style={{ height: 132 }}>
                  {stats.byMonth.map(m => {
                    const h = (m.revenue / maxMonth) * 100
                    const isPeak = m.revenue > 0 && m.key === peakMonth.key
                    return (
                      <div
                        key={m.key}
                        className="flex-1 flex flex-col items-center justify-end h-full gap-1"
                        title={`${m.label} ${m.year}: ${formatPrice(m.revenue)} · ${m.count} ${m.count === 1 ? 'libro' : 'libri'}`}
                      >
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-[var(--forest)]">
                        {b.soldPrice != null ? formatPrice(b.soldPrice) : '—'}
                      </p>
                      {b.purchasePrice != null && b.soldPrice != null && (
                        <p className="text-[11px]" style={{ color: b.soldPrice - b.purchasePrice >= 0 ? '#1F8A5B' : '#D1483B' }}>
                          {b.soldPrice - b.purchasePrice >= 0 ? '+' : ''}{formatPrice(b.soldPrice - b.purchasePrice)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
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
