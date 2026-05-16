'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, X, Zap, BookOpen, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { TopBar } from '@/components/TopBar'
import { fileToBase64 } from '@/lib/utils'
import type { Book } from '@/types'

type ScanState = 'idle' | 'scanning' | 'found' | 'error'

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ScanState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Partial<Book> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleImage = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file)
    setPreview(base64)
    setState('scanning')
    setError('')

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (data.error || !data.title) {
        setState('error')
        setError('Libro non riconosciuto. Riprova con un\'immagine più nitida.')
      } else {
        setResult(data)
        setState('found')
      }
    } catch {
      setState('error')
      setError('Errore di connessione. Riprova.')
    }
  }, [])

  const saveBook = async () => {
    if (!result) return
    setSaving(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result, status: 'read' }),
      })
      const saved = await res.json()
      router.push(`/app/book/${saved.id}`)
    } catch {
      setSaving(false)
    }
  }

  const reset = () => {
    setState('idle')
    setPreview(null)
    setResult(null)
    setError('')
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ink)' }}>
      <div className="relative">
        <TopBar
          title="Scansiona libro"
          back
          transparent
          className="text-white"
        />
      </div>

      {/* Camera area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {preview ? (
          <div className="relative w-full h-full max-h-[50vh]">
            <Image src={preview} alt="Preview" fill className="object-contain" />
            {state === 'scanning' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <div className="flex gap-1 mb-4">
                  {[0.1, 0.2, 0.3].map(d => (
                    <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-amber)', animationDelay: `${d}s` }} />
                  ))}
                </div>
                <p className="text-white text-sm font-medium">Analisi in corso…</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-48 h-64 mb-8">
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/30" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
              <div
                className="absolute left-0 right-0 h-0.5 animate-scan"
                style={{ background: 'var(--accent-amber)', boxShadow: '0 0 8px var(--accent-amber)' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Camera size={40} className="text-white/40" />
              </div>
            </div>
            <p className="text-white/80 text-sm">Scatta una foto alla copertina del libro o carica un\'immagine</p>
          </div>
        )}
      </div>

      {/* Result panel */}
      {state === 'found' && result && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--cream-2)' }}>
              {result.cover && <Image src={result.cover} alt="" width={48} height={64} className="object-cover w-full h-full" unoptimized />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} style={{ color: 'var(--forest)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forest)' }}>Libro trovato</span>
              </div>
              <h3 className="font-serif text-lg font-semibold leading-tight">{result.title}</h3>
              <p className="text-sm text-[var(--muted)]">{result.author}</p>
              {result.year && <p className="text-xs text-[var(--muted)]">{result.year} · {result.publisher}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
              Riprova
            </button>
            <button onClick={saveBook} disabled={saving} className="flex-2 px-6 py-3 rounded-2xl text-sm font-semibold flex-1 transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              {saving ? 'Salvataggio…' : 'Aggiungi alla libreria'}
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className="text-red-500" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <button onClick={reset} className="w-full py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            Riprova
          </button>
        </div>
      )}

      {/* Controls */}
      {state === 'idle' && (
        <div className="p-6 pb-8 flex items-center justify-center gap-8">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <Upload size={22} className="text-white" />
            <span className="text-xs text-white/70">Galleria</span>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="w-18 h-18 rounded-full flex items-center justify-center shadow-xl animate-pulse-ring transition-all active:scale-95"
            style={{ background: 'var(--accent-amber)', width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full border-3 border-white/50 flex items-center justify-center">
              <Camera size={28} style={{ color: 'var(--ink)' }} />
            </div>
          </button>

          <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <BookOpen size={22} className="text-white/30" />
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f) }}
      />
    </div>
  )
}
