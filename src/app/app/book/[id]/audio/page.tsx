'use client'
import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { TopBar } from '@/components/TopBar'
import { AudioPlayer } from '@/components/AudioPlayer'
import type { Book } from '@/types'

export default function AudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [book, setBook] = useState<Book | null>(null)
  const [audioData, setAudioData] = useState<{ script?: string; url?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const autoSpeakRef = useRef(false)

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then(r => r.json())
      .then(data => { setBook(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  // If generation returned only a script (ElevenLabs unavailable), trigger browser TTS
  useEffect(() => {
    if (!autoSpeakRef.current) return
    if (audioData?.url) return // real audio handled by AudioPlayer auto-play
    if (!audioData?.script) return
    autoSpeakRef.current = false
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(audioData.script)
    u.lang = 'it-IT'
    u.rate = 0.88
    window.speechSynthesis.speak(u)
  }, [audioData])

  const generate = async () => {
    if (generating || audioData?.url) return
    setGenerating(true)
    autoSpeakRef.current = true
    try {
      const r = await fetch(`/api/audio/${id}`)
      if (r.headers.get('content-type')?.includes('audio')) {
        const blob = await r.blob()
        setAudioData({ url: URL.createObjectURL(blob) })
      } else {
        const json = await r.json()
        setAudioData(json)
      }
    } catch {
      // On network error, generate a local script for browser TTS
      if (book) {
        setAudioData({
          script: `Benvenuto in BookEcho. Stai per ascoltare il trailer di "${book.title}" di ${book.author}. ${book.summary ?? ''} Un libro che non dimenticherai.`
        })
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
