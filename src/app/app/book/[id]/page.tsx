'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Star, Headphones, TrendingUp, ShoppingBag, BookOpen, Trash2, Heart, Edit3 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book } from '@/types'
import { cn, formatDate } from '@/lib/utils'
import { EMOTIONS } from '@/types'

const ACTION_CARDS = [
  { href: 'audio', icon: Headphones, label: 'Trailer Audio', desc: 'Ascolta il riassunto', color: 'var(--forest-darker)', textColor: 'var(--cream)' },
  { href: 'market', icon: TrendingUp, label: 'Valore di mercato', desc: 'Stima aggiornata', color: 'var(--cream-2)', textColor: 'var(--ink)' },
  { href: 'sell', icon: ShoppingBag, label: 'Crea annuncio', desc: 'Pronto per vendere', color: 'var(--accent-amber)', textColor: 'var(--ink)' },
]

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [emotions, setEmotions] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then(r => r.json())
      .then(data => {
        setBook(data)
        setRating(data.rating ?? 0)
        setEmotions(data.emotions ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const setRatingAndSave = (r: number) => {
    setRating(r)
    fetch(`/api/books/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: r }) })
  }

  const toggleEmotion = (e: string) => {
    const next = emotions.includes(e) ? emotions.filter(x => x !== e) : [...emotions, e]
    setEmotions(next)
    fetch(`/api/books/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emotions: next }) })
  }

  if (loading) return (
    <div className="p-4 space-y-4">
      <div className="skeleton h-64 rounded-3xl" />
      <div className="skeleton h-8 rounded-xl w-2/3" />
      <div className="skeleton h-4 rounded-xl w-1/3" />
    </div>
  )

  if (!book) return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-8">
      <BookOpen size={40} className="text-[var(--muted)] mb-4" />
      <h2 className="font-serif text-xl font-semibold">Libro non trovato</h2>
    </div>
  )

  return (
    <div>
      <TopBar back right={
        <Link href={`/app/book/${id}/edit`} className="p-2 rounded-full hover:bg-[var(--cream-2)] transition-colors">
          <Edit3 size={18} />
        </Link>
      } />

      {/* Cover hero */}
      <div className="relative mx-4 mt-2 rounded-3xl overflow-hidden" style={{ height: 260, background: 'var(--forest-darker)' }}>
        {book.cover ? (
          <Image src={book.cover} alt={book.title} fill className="object-cover opacity-40" unoptimized />
        ) : null}
        <div className="absolute inset-0 flex items-end p-5">
          <div className="flex gap-4 items-end">
            <div className="w-20 h-28 rounded-2xl overflow-hidden shadow-xl flex-shrink-0" style={{ background: 'var(--cream-2)' }}>
              {book.cover ? (
                <Image src={book.cover} alt="" width={80} height={112} className="object-cover w-full h-full" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-[var(--muted)]" /></div>
              )}
            </div>
            <div className="text-white">
              <h1 className="font-serif text-xl font-semibold leading-tight mb-1">{book.title}</h1>
              <p className="text-sm opacity-80">{book.author}</p>
              <p className="text-xs opacity-60 mt-0.5">{book.year} · {book.publisher}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Rating */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} onClick={() => setRatingAndSave(i + 1)}>
              <Star size={24} className={cn('transition-all', i < rating ? 'text-[var(--accent-amber)] fill-[var(--accent-amber)]' : 'text-[var(--cream-3)]')} />
            </button>
          ))}
          <span className="text-xs text-[var(--muted)] ml-2">{rating ? `${rating}/5` : 'Valuta'}</span>
        </div>

        {/* Summary */}
        {book.summary && (
          <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <p className="text-sm leading-relaxed text-[var(--ink-2)]">{book.summary}</p>
          </div>
        )}

        {/* Emotions */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Come ti ha fatto sentire</p>
          <div className="flex flex-wrap gap-2">
            {EMOTIONS.map(e => (
              <button
                key={e}
                onClick={() => toggleEmotion(e)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95',
                  emotions.includes(e)
                    ? 'text-[var(--cream)]'
                    : 'text-[var(--muted)] border border-[var(--line)]'
                )}
                style={emotions.includes(e) ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Action cards */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">Funzionalità</p>
          <div className="grid grid-cols-3 gap-2">
            {ACTION_CARDS.map(card => (
              <Link
                key={card.href}
                href={`/app/book/${id}/${card.href}`}
                className="p-3 rounded-2xl flex flex-col gap-2 transition-all active:scale-95"
                style={{ background: card.color, color: card.textColor }}
              >
                <card.icon size={20} />
                <div>
                  <p className="font-semibold text-xs leading-tight">{card.label}</p>
                  <p className="text-xs opacity-60 leading-tight mt-0.5">{card.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Meta info */}
        <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--cream-2)' }}>
          {[
            { label: 'ISBN', value: book.isbn },
            { label: 'Pagine', value: book.pages },
            { label: 'Genere', value: book.genre },
            { label: 'Lingua', value: book.language?.toUpperCase() },
            { label: 'Aggiunto il', value: formatDate(book.createdAt) },
          ].filter(r => r.value).map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{row.label}</span>
              <span className="font-medium text-[var(--ink)]">{String(row.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
