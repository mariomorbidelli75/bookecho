'use client'
import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import { RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { MarketValueCard } from '@/components/MarketValueCard'
import type { Book, MarketData } from '@/types'
import { getBook, updateBook } from '@/lib/storage'
import { apiFetch } from '@/lib/api'

// Una valutazione vale 30 giorni: riaprire la pagina non costa nulla,
// si ricerca solo quando l'utente chiede di aggiornare.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const evaluate = useCallback(async (b: Book) => {
    setLoading(true)
    setFailed(false)
    try {
      const r = await apiFetch(`/api/market/${b.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: { ...b, locationPhoto: null, cover: b.cover?.startsWith('data:') ? null : b.cover } }),
      })
      const m = await r.json() as MarketData
      if (!r.ok || typeof m.avg !== 'number') throw new Error()
      setMarket(m)
      updateBook(b.id, { marketData: m })
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const b = getBook(id)
    if (!b) { setLoading(false); return }
    setBook(b)
    const cached = b.marketData
    const fresh = cached?.method && Date.now() - new Date(cached.lastUpdated).getTime() < MAX_AGE_MS
    if (cached && fresh) { setMarket(cached); setLoading(false) }
    else evaluate(b)
  }, [id, evaluate])

  return (
    <div>
      <TopBar
        title="Valore di mercato"
        back
        right={book && !loading ? (
          <button onClick={() => evaluate(book)} aria-label="Aggiorna prezzi" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--cream-2)]">
            <RefreshCw size={18} />
          </button>
        ) : undefined}
      />
      <div className="px-4 py-4 space-y-4">
        {book && (
          <div>
            <h2 className="font-serif text-lg font-semibold">{book.title}</h2>
            <p className="text-sm text-[var(--muted)]">{book.author}</p>
          </div>
        )}
        {loading ? (
          <>
            <p className="text-sm text-[var(--muted)]">Cerco il libro su eBay, Vinted, Subito, AbeBooks e altri portali…</p>
            <div className="skeleton rounded-2xl h-40" />
            <div className="skeleton rounded-xl h-16" />
            <div className="skeleton rounded-xl h-16" />
          </>
        ) : market ? (
          <MarketValueCard data={market} />
        ) : (
          <div className="p-6 text-center rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <p className="text-[var(--muted)]">{failed ? 'Valutazione non riuscita, riprova tra poco.' : 'Libro non trovato in libreria'}</p>
          </div>
        )}
        {market && !loading && (
          <div className="p-3 rounded-xl text-xs text-[var(--muted)]" style={{ background: 'var(--cream-2)' }}>
            {market.method === 'annunci'
              ? `ℹ️ Calcolato su ${market.found} ${market.found === 1 ? 'annuncio reale' : 'annunci reali'} dell'usato. Sono prezzi richiesti dai venditori, non prezzi di vendita conclusi. Tocca ↻ per aggiornare.`
              : 'ℹ️ Nessun annuncio trovato online: questa è solo una stima indicativa in base all\'età del libro. Controlla i portali qui sopra.'}
          </div>
        )}
      </div>
    </div>
  )
}
