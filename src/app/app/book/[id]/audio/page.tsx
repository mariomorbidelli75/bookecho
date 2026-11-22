'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import { TopBar } from '@/components/TopBar'
import { AudioPlayer } from '@/components/AudioPlayer'
import type { Book } from '@/types'
import { getBook, updateBook } from '@/lib/storage'
import { apiFetch } from '@/lib/api'

export default function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [audioData, setAudioData] = useState<{ script?: string; url?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    const data = getBook(id)
    if (data) {
      setBook(data)
      // Testo già generato in passato: si riusa, senza richiamare l'AI
      if (data.audioScript) setAudioData({ script: data.audioScript })
    }
    setLoading(false)
  }, [id])

  const generate = async () => {
    if (generating || !book) return
    setGenerating(true)
    try {
      const r = await apiFetch(`/api/audio/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book }),
      })
      if (r.headers.get('content-type')?.includes('audio')) {
        const blob = await r.blob()
        setAudioData({ url: URL.createObjectURL(blob) })
      } else {
        const json = await r.json()
        setAudioData(json)
        // Salva testo del trailer e trama trovata, così la prossima volta è gratis
        if (json.script) updateBook(id, { audioScript: json.script, ...(json.summary ? { summary: json.summary } : {}) })
        if (json.summary) setBook(prev => prev ? { ...prev, summary: json.summary } : prev)
      }
    } catch {
      if (book) {
        setAudioData({ script: `"${book.title}" di ${book.author}. ${book.summary ?? ''} Un libro che non dimenticherai.` })
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <TopBar title="Trailer Audio" back />
      <div className="px-4 py-4">
        {loading ? (
          <div className="skeleton rounded-3xl h-64" />
        ) : (
          <AudioPlayer
            audioUrl={audioData?.url}
            script={audioData?.script}
            bookTitle={book?.title}
            onGenerate={generate}
            generating={generating}
          />
        )}
        {book && (
          <div className="mt-4 p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Il libro</p>
            <p className="font-serif text-base font-semibold">{book.title}</p>
            <p className="text-sm text-[var(--muted)]">{book.author}</p>
            {book.summary && <p className="text-sm text-[var(--ink-2)] mt-2 leading-relaxed">{book.summary}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
