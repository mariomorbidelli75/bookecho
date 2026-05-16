'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import { TopBar } from '@/components/TopBar'
import { MarketValueCard } from '@/components/MarketValueCard'
import type { Book, MarketData } from '@/types'

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [market, setMarket] = useState<MarketData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/books/${id}`).then(r => r.json()),
      fetch(`/api/market/${id}`).then(r => r.json()),
    ]).then(([b, m]) => {
      setBook(b)
      setMarket(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  return (
    <div>
      <TopBar title="Valore di mercato" back />
      <div className="px-4 py-4 space-y-4">
        {book && (
          <div>
            <h2 className="font-serif text-lg font-semibold">{book.title}</h2>
            <p className="text-sm text-[var(--muted)]">{book.author}</p>
          </div>
        )}

        {loading ? (
          <>
            <div className="skeleton rounded-2xl h-40" />
            <div className="skeleton rounded-xl h-16" />
            <div className="skeleton rounded-xl h-16" />
          </>
        ) : market ? (
          <MarketValueCard data={market} />
        ) : (
          <div className="p-6 text-center rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <p className="text-[var(--muted)]">Dati di mercato non disponibili</p>
          </div>
        )}

        <div className="p-3 rounded-xl text-xs text-[var(--muted)]" style={{ background: 'var(--cream-2)' }}>
          ℹ️ La stima è basata su vendite recenti su eBay, Catawiki, Vinted e Subito. I prezzi variano in base alle condizioni del libro e all'edizione.
        </div>
      </div>
    </div>
  )
}
