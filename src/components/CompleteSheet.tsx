'use client'
import { useState } from 'react'
import { Sparkles, Check, AlertCircle } from 'lucide-react'
import type { Book } from '@/types'
import { updateBook } from '@/lib/storage'

const FIELD_LABELS: Record<string, string> = {
  cover: 'copertina',
  summary: 'trama',
  publisher: 'editore',
  year: 'anno',
  isbn: 'ISBN',
  pages: 'pagine',
  genre: 'genere',
}

const SOURCE_LABELS: Record<string, string> = {
  google: 'Google Books',
  openlibrary: 'Open Library',
  wikipedia: 'Wikipedia',
  ai: 'sintesi AI',
  photo: 'la tua foto',
}

// Campi che ha senso ripescare dalle fonti quando la scheda è incompleta.
const FILLABLE = ['cover', 'summary', 'publisher', 'year', 'isbn', 'pages', 'genre', 'language'] as const

function gaps(book: Book): string[] {
  return FILLABLE.filter(f => f !== 'language' && book[f] == null)
}

// Ripesca dai cataloghi i campi che mancano alla scheda, senza toccare quelli
// già compilati (una correzione fatta a mano vale più di una fonte esterna).
export function CompleteSheet({ book, onUpdated }: { book: Book; onUpdated: (b: Book) => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const missing = gaps(book)
  if (missing.length === 0 && state === 'idle') return null

  const run = async () => {
    setState('loading')
    setMessage('')
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author, isbn: book.isbn }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setMessage(data.error ?? 'Completamento non riuscito.')
        return
      }

      // Si riempiono solo i buchi: quello che c'era resta com'era.
      const updates: Partial<Book> = {}
      const filled: string[] = []
      for (const field of FILLABLE) {
        if (book[field] == null && data[field] != null) {
          (updates as Record<string, unknown>)[field] = data[field]
          if (field !== 'language') filled.push(field)
        }
      }
      if (updates.summary && data.sources?.summary) {
        updates.summarySource = data.sources.summary
      }

      if (filled.length === 0) {
        setState('error')
        setMessage(data.warning ?? 'Le fonti non hanno nulla in più di quello che hai già.')
        return
      }

      const updated = updateBook(book.id, updates)
      if (updated) onUpdated(updated)
      setState('done')
      setMessage(
        filled
          .map(f => {
            const from = data.sources?.[f]
            return from ? `${FIELD_LABELS[f] ?? f} (${SOURCE_LABELS[from] ?? from})` : FIELD_LABELS[f] ?? f
          })
          .join(' · ')
      )
    } catch {
      setState('error')
      setMessage('Connessione non riuscita.')
    }
  }

  if (state === 'done') {
    return (
      <div className="p-4 rounded-2xl flex items-start gap-2.5" style={{ background: 'rgba(31,138,91,0.14)' }}>
        <Check size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#1F8A5B' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#186B47' }}>Scheda completata</p>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">Aggiunti: {message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
      <div className="flex items-start gap-2.5 mb-3">
        <Sparkles size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--forest)' }} />
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">Scheda incompleta</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Manca{missing.length === 1 ? '' : 'no'}: {missing.map(f => FIELD_LABELS[f] ?? f).join(', ')}.
            Cerco su Google Books, Open Library e Wikipedia.
          </p>
        </div>
      </div>

      {state === 'error' && (
        <p className="text-xs mb-3 flex items-start gap-1.5" style={{ color: '#B86B1A' }}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" /> {message}
        </p>
      )}

      <button
        onClick={run}
        disabled={state === 'loading'}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'var(--cream)' }}
      >
        {state === 'loading' ? 'Cerco nelle fonti…' : 'Completa la scheda'}
      </button>
    </div>
  )
}
