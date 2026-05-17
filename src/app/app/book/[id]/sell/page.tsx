'use client'
import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { RefreshCw, Copy, Share2, Check } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book, SellListing } from '@/types'
import { PLATFORMS } from '@/types'
import { cn } from '@/lib/utils'
import { getBook } from '@/lib/storage'

const PLATFORM_ICONS: Record<string, string> = {
  eBay: '🛍️', Catawiki: '🎨', Vinted: '👕', Subito: '📦', Instagram: '📸'
}

export default function SellPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [platform, setPlatform] = useState('eBay')
  const [listing, setListing] = useState<SellListing | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    const b = getBook(id)
    if (b) {
      setBook(b)
      initializedRef.current = true
      generate(b, 'eBay')
    }
  }, [id])

  useEffect(() => {
    if (!initializedRef.current || !book) return
    generate(book, platform)
  }, [platform])

  const generate = async (b: Book, p: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/listing/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book: b, platform: p }),
      })
      setListing(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!listing) return
    const text = `${listing.title}\n\n${listing.description}\n\n${listing.hashtags.join(' ')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <TopBar
        title="Crea annuncio"
        back
        right={
          <button onClick={() => book && generate(book, platform)} disabled={loading} className="p-2 rounded-full hover:bg-[var(--cream-2)] transition-colors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />
      <div className="px-4 py-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Marketplace</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all active:scale-95', platform === p ? 'text-[var(--cream)]' : 'text-[var(--ink)] border border-[var(--line)]')}
                style={platform === p ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
              >
                <span>{PLATFORM_ICONS[p]}</span><span>{p}</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-8 rounded-xl w-3/4" />
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
        ) : listing ? (
          <>
            <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Titolo annuncio</p>
              <p className="font-semibold text-sm leading-snug">{listing.title}</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Descrizione</p>
              <p className="text-sm leading-relaxed whitespace-pre-line text-[var(--ink-2)]">{listing.description}</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Hashtag</p>
              <div className="flex flex-wrap gap-1.5">
                {listing.hashtags.map(tag => (
                  <span key={tag} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: 'rgba(30,77,58,0.1)', color: 'var(--forest)' }}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              <span className="text-sm font-medium opacity-80">Prezzo suggerito</span>
              <span className="font-serif text-2xl font-semibold">€{listing.price.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={copyAll} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: copied ? '#4A8B6F' : 'var(--forest)', color: 'var(--cream)' }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiato!' : 'Copia tutto'}
              </button>
              <button onClick={() => navigator.share?.({ title: listing.title, text: listing.description })} className="py-3 px-4 rounded-2xl flex items-center justify-center border transition-all active:scale-95" style={{ borderColor: 'var(--line-2)' }}>
                <Share2 size={16} />
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
