'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, BookOpen, RefreshCw } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Suggestion } from '@/types'
import { getBooks } from '@/lib/storage'

export default function SuggestPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    const books = getBooks()
    fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books }),
    })
      .then(r => r.json())
      .then(data => { setSuggestions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div>
      <TopBar title="Suggerimenti AI" right={
        <button onClick={load} className="p-2 rounded-full hover:bg-[var(--cream-2)] transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      } />
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4 p-3 rounded-2xl" style={{ background: 'rgba(30,77,58,0.08)' }}>
          <Sparkles size={16} style={{ color: 'var(--forest)' }} />
          <p className="text-sm text-[var(--forest)] font-medium">Basati sui tuoi gusti e le emozioni provate</p>
        </div>
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)
          ) : suggestions.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={32} className="mx-auto text-[var(--muted)] mb-3" />
              <p className="text-sm text-[var(--muted)]">Aggiungi libri alla libreria per ricevere suggerimenti</p>
            </div>
          ) : suggestions.map((s, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-2xl animate-fade-up" style={{ background: 'white', border: '1px solid var(--line)', animationDelay: `${i * 0.08}s`, opacity: 0 }}>
              <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--cream-2)' }}>
                {s.cover ? (
                  <Image src={s.cover} alt={s.title} width={56} height={80} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><BookOpen size={18} className="text-[var(--muted)]" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-semibold text-sm leading-tight">{s.title}</h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{s.author}</p>
                  </div>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(30,77,58,0.1)', color: 'var(--forest)' }}>
                    {s.matchScore}
                  </div>
                </div>
                {s.genre && <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--cream-2)', color: 'var(--muted)' }}>{s.genre}</span>}
                <p className="text-xs text-[var(--ink-2)] mt-1.5 leading-snug line-clamp-2">{s.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
