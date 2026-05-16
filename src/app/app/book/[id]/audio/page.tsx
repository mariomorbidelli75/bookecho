'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import { TopBar } from '@/components/TopBar'
import { AudioPlayer } from '@/components/AudioPlayer'
import type { Book } from '@/types'

export default function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [audioData, setAudioData] = useState<{ script?: string; url?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/books/${id}`).then(r => r.json()),
      fetch(`/api/audio/${id}`).then(async r => {
        if (r.headers.get('content-type')?.includes('audio')) {
          const blob = await r.blob()
          return { url: URL.createObjectURL(blob) }
        }
        return r.json()
      })
    ]).then(([bookData, audio]) => {
      setBook(bookData)
      setAudioData(audio)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

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
