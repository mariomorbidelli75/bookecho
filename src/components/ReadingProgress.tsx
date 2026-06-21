'use client'
import { useState } from 'react'
import { Play, Check, RotateCcw, BookMarked } from 'lucide-react'
import type { Book } from '@/types'

function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function fromDateInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

interface Props {
  book: Book
  onUpdate: (updates: Partial<Book>) => void
}

export function ReadingProgress({ book, onUpdate }: Props) {
  const pages = book.pages ?? 0
  const max = pages > 0 ? pages : 100
  const hasPages = pages > 0

  const [current, setCurrent] = useState<number>(
    book.currentPage ?? (book.status === 'read' ? max : 0)
  )
  const [started, setStarted] = useState<string | null>(book.readingStartedAt ?? null)
  const [finished, setFinished] = useState<string | null>(book.readingFinishedAt ?? null)

  const percent = hasPages
    ? Math.min(100, Math.round((current / pages) * 100))
    : Math.min(100, Math.round(current))

  // Persist the page reached when the user releases the slider.
  const commit = (value: number) => {
    const updates: Partial<Book> = { currentPage: value }
    if (value > 0 && !started) {
      const now = new Date().toISOString()
      setStarted(now)
      updates.readingStartedAt = now
    }
    if (value > 0 && book.status === 'wishlist') updates.status = 'reading'
    if (hasPages && value >= pages) {
      if (!finished) {
        const now = new Date().toISOString()
        setFinished(now)
        updates.readingFinishedAt = now
      }
      updates.status = 'read'
    }
    onUpdate(updates)
  }

  const startReading = () => {
    const now = new Date().toISOString()
    setStarted(now)
    onUpdate({ status: 'reading', readingStartedAt: now })
  }

  const finishReading = () => {
    const now = new Date().toISOString()
    setFinished(now)
    setCurrent(max)
    onUpdate({ status: 'read', readingFinishedAt: now, currentPage: max })
  }

  const restart = () => {
    setCurrent(0)
    setStarted(null)
    setFinished(null)
    onUpdate({ status: 'reading', currentPage: 0, readingStartedAt: new Date().toISOString(), readingFinishedAt: null })
  }

  return (
    <div className="p-4 rounded-2xl space-y-4" style={{ background: 'var(--cream-2)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked size={16} style={{ color: 'var(--forest)' }} />
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Progresso lettura</p>
        </div>
        <span className="font-serif text-lg font-semibold" style={{ color: 'var(--forest)' }}>{percent}%</span>
      </div>

      {/* Horizontal slider — drag to set the page reached */}
      <div>
        <input
          type="range"
          min={0}
          max={max}
          value={current}
          onChange={e => setCurrent(Number(e.target.value))}
          onPointerUp={() => commit(current)}
          onKeyUp={() => commit(current)}
          className="w-full h-2 rounded-full cursor-pointer accent-[var(--forest)]"
          style={{ accentColor: 'var(--forest)' }}
          aria-label="Pagina raggiunta"
        />
        <div className="flex items-center justify-between mt-1 text-xs text-[var(--muted)]">
          {hasPages ? (
            <>
              <span>Pag.{' '}
                <input
                  type="number"
                  min={0}
                  max={pages}
                  value={current}
                  onChange={e => setCurrent(Math.min(pages, Math.max(0, Number(e.target.value))))}
                  onBlur={() => commit(current)}
                  className="w-14 px-2 py-0.5 rounded-md text-center font-semibold text-[var(--ink)] outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
                />
                {' '}di {pages}
              </span>
              <span>{pages - current > 0 ? `${pages - current} pagine alla fine` : 'Completato'}</span>
            </>
          ) : (
            <span>Trascina per impostare la percentuale letta</span>
          )}
        </div>
      </div>

      {/* Reading dates */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--muted)]">Inizio lettura</span>
          <input
            type="date"
            value={toDateInput(started)}
            onChange={e => { const iso = fromDateInput(e.target.value); setStarted(iso); onUpdate({ readingStartedAt: iso }) }}
            className="px-3 py-2 rounded-xl text-sm text-[var(--ink)] outline-none"
            style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--muted)]">Fine lettura</span>
          <input
            type="date"
            value={toDateInput(finished)}
            onChange={e => { const iso = fromDateInput(e.target.value); setFinished(iso); onUpdate({ readingFinishedAt: iso }) }}
            className="px-3 py-2 rounded-xl text-sm text-[var(--ink)] outline-none"
            style={{ background: 'var(--cream)', border: '1px solid var(--line)' }}
          />
        </label>
      </div>

      {/* Quick actions */}
      {book.status === 'read' ? (
        <button
          onClick={restart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--cream)', color: 'var(--ink)', border: '1px solid var(--line)' }}
        >
          <RotateCcw size={15} /> Rileggi da capo
        </button>
      ) : book.status === 'reading' ? (
        <button
          onClick={finishReading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--forest)', color: 'var(--cream)' }}
        >
          <Check size={15} /> Segna come letto
        </button>
      ) : (
        <button
          onClick={startReading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ background: 'var(--forest)', color: 'var(--cream)' }}
        >
          <Play size={15} /> Inizia a leggere
        </button>
      )}
    </div>
  )
}
