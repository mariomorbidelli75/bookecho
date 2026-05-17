'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Zap, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { TopBar } from '@/components/TopBar'
import { fileToBase64 } from '@/lib/utils'
import type { Book } from '@/types'

type ScanState = 'idle' | 'scanning' | 'found' | 'error'
type ScanMode = 'cover' | 'barcode'

declare global {
  interface Window {
    BarcodeDetector: {
      new(opts?: { formats: string[] }): {
        detect(src: HTMLVideoElement): Promise<Array<{ rawValue: string; format: string }>>
      }
    }
  }
}

export default function ScanPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastIsbnRef = useRef('')

  const [mode, setMode] = useState<ScanMode>('cover')
  const [state, setState] = useState<ScanState>('idle')
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<Partial<Book> | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [hasBarcode, setHasBarcode] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)

  useEffect(() => {
    setHasBarcode(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  const stopCamera = useCallback(() => {
    if (rafRef.current) { clearTimeout(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const handleIsbn = useCallback(async (isbn: string) => {
    setState('scanning')
    setError('')
    try {
      const res = await fetch(`/api/isbn?isbn=${encodeURIComponent(isbn)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        setState('error')
        setError(data.error ?? `ISBN ${isbn} non trovato. Verifica il codice.`)
      } else {
        setResult(data)
        setState('found')
      }
    } catch {
      setState('error')
      setError('Errore di connessione. Riprova.')
    }
  }, [])

  const startBarcodeCamera = useCallback(async () => {
    if (!hasBarcode) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39'] })

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          for (const code of codes) {
            const v = code.rawValue.replace(/[-\s]/g, '')
            if (v !== lastIsbnRef.current && /^\d{10}(\d{3})?$/.test(v)) {
              lastIsbnRef.current = v
              stopCamera()
              await handleIsbn(v)
              return
            }
          }
        } catch {}
        rafRef.current = setTimeout(tick, 300)
      }
      tick()
    } catch {
      setState('error')
      setError('Impossibile accedere alla fotocamera. Controlla i permessi.')
    }
  }, [hasBarcode, stopCamera, handleIsbn])

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

  const reset = useCallback(() => {
    stopCamera()
    setState('idle')
    setPreview(null)
    setResult(null)
    setError('')
    setManualIsbn('')
    lastIsbnRef.current = ''
  }, [stopCamera])

  const switchMode = (m: ScanMode) => {
    reset()
    setMode(m)
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ink)' }}>
      <TopBar title="Scansiona libro" back transparent className="text-white" />

      {/* Mode tabs — only shown when idle */}
      {state === 'idle' && (
        <div className="flex mx-4 mt-1 p-1 rounded-2xl gap-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
          {(['cover', 'barcode'] as ScanMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={mode === m ? { background: 'var(--accent-amber)', color: 'var(--ink)' } : { color: 'rgba(255,255,255,0.6)' }}
            >
              {m === 'cover' ? '📷 Foto copertina' : '📊 ISBN barcode'}
            </button>
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* COVER MODE — preview or viewfinder */}
        {mode === 'cover' && (
          preview ? (
            <div className="relative w-full h-full max-h-[50vh]">
              <Image src={preview} alt="Preview" fill className="object-contain" />
              {state === 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <Dots />
                  <p className="text-white text-sm font-medium mt-2">Analisi copertina…</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="relative w-48 h-64 mb-8">
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/30" />
                <Corner pos="top-0 left-0" cls="border-t-2 border-l-2 rounded-tl-lg" />
                <Corner pos="top-0 right-0" cls="border-t-2 border-r-2 rounded-tr-lg" />
                <Corner pos="bottom-0 left-0" cls="border-b-2 border-l-2 rounded-bl-lg" />
                <Corner pos="bottom-0 right-0" cls="border-b-2 border-r-2 rounded-br-lg" />
                <div className="absolute left-0 right-0 h-0.5 animate-scan" style={{ background: 'var(--accent-amber)', boxShadow: '0 0 8px var(--accent-amber)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera size={40} className="text-white/40" />
                </div>
              </div>
              <p className="text-white/70 text-sm">Scatta una foto alla copertina del libro</p>
            </div>
          )
        )}

        {/* BARCODE MODE */}
        {mode === 'barcode' && state === 'idle' && (
          <div className="w-full flex flex-col items-center px-5 gap-5 py-4">

            {/* Video area */}
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl" style={{ background: '#000', aspectRatio: '16/9' }}>
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

              {/* Barcode frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-4/5 h-16">
                  <div className="absolute inset-0 border border-white/20 rounded" />
                  <span className="absolute -top-5 left-0 right-0 text-center text-white/50 text-xs">Centra il codice a barre</span>
                  {/* Corners */}
                  <Corner pos="top-0 left-0" cls="border-t-2 border-l-2" amber />
                  <Corner pos="top-0 right-0" cls="border-t-2 border-r-2" amber />
                  <Corner pos="bottom-0 left-0" cls="border-b-2 border-l-2" amber />
                  <Corner pos="bottom-0 right-0" cls="border-b-2 border-r-2" amber />
                  {cameraActive && (
                    <div className="absolute left-0 right-0 h-0.5 animate-scan" style={{ background: 'var(--accent-amber)', boxShadow: '0 0 6px var(--accent-amber)' }} />
                  )}
                </div>
              </div>

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="text-4xl">📊</span>
                  <p className="text-white/50 text-xs">Scanner non attivo</p>
                </div>
              )}
            </div>

            {/* Scanner button */}
            {hasBarcode && (
              <button
                onClick={cameraActive ? stopCamera : startBarcodeCamera}
                className="w-full max-w-sm py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={cameraActive
                  ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                  : { background: 'var(--accent-amber)', color: 'var(--ink)' }}
              >
                {cameraActive ? 'Interrompi scanner' : 'Avvia scanner barcode'}
              </button>
            )}

            {!hasBarcode && (
              <p className="text-white/50 text-xs text-center max-w-xs">
                Il tuo browser non supporta la scansione barcode. Usa l'input manuale qui sotto.
              </p>
            )}

            {/* Manual ISBN input */}
            <div className="w-full max-w-sm">
              <p className="text-white/50 text-xs mb-2 text-center">
                {hasBarcode ? 'Oppure inserisci il codice manualmente:' : 'Inserisci il codice ISBN:'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={manualIsbn}
                  onChange={e => setManualIsbn(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="Es. 9788804668237"
                  className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
                  onKeyDown={e => e.key === 'Enter' && manualIsbn.length >= 10 && handleIsbn(manualIsbn)}
                />
                <button
                  onClick={() => handleIsbn(manualIsbn)}
                  disabled={manualIsbn.length < 10}
                  className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}
                >
                  Cerca
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barcode scanning spinner */}
        {mode === 'barcode' && state === 'scanning' && (
          <div className="flex flex-col items-center justify-center gap-4">
            <Dots />
            <p className="text-white text-sm font-medium">Ricerca libro in corso…</p>
          </div>
        )}
      </div>

      {/* Result panel */}
      {state === 'found' && result && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream-2)' }}>
              {result.cover
                ? <Image src={result.cover} alt="" width={48} height={64} className="object-cover w-full h-full" unoptimized />
                : <span className="text-2xl">📚</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={14} style={{ color: 'var(--forest)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forest)' }}>Libro trovato</span>
              </div>
              <h3 className="font-serif text-lg font-semibold leading-tight truncate">{result.title}</h3>
              <p className="text-sm text-[var(--muted)] truncate">{result.author}</p>
              {result.year && <p className="text-xs text-[var(--muted)]">{result.year}{result.publisher ? ` · ${result.publisher}` : ''}</p>}
              {result.isbn && <p className="text-xs font-mono text-[var(--muted)]">ISBN {result.isbn}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
              Riprova
            </button>
            <button onClick={saveBook} disabled={saving} className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              {saving ? 'Salvataggio…' : 'Aggiungi alla libreria'}
            </button>
          </div>
        </div>
      )}

      {/* Error panel */}
      {state === 'error' && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <button onClick={reset} className="w-full py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            Riprova
          </button>
        </div>
      )}

      {/* Controls — cover mode only */}
      {mode === 'cover' && state === 'idle' && (
        <div className="p-6 pb-8 flex items-center justify-center gap-8">
          <button
            onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click() } }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <Upload size={22} className="text-white" />
            <span className="text-xs text-white/70">Galleria</span>
          </button>

          <button
            onClick={() => { if (fileRef.current) { fileRef.current.setAttribute('capture', 'environment'); fileRef.current.click() } }}
            className="rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95"
            style={{ background: 'var(--accent-amber)', width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full border-2 border-white/50 flex items-center justify-center">
              <Camera size={28} style={{ color: 'var(--ink)' }} />
            </div>
          </button>

          <div style={{ width: 54 }} />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = '' }}
      />
    </div>
  )
}

function Dots() {
  return (
    <div className="flex gap-1">
      {[0.1, 0.2, 0.3].map(d => (
        <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-amber)', animationDelay: `${d}s` }} />
      ))}
    </div>
  )
}

function Corner({ pos, cls, amber }: { pos: string; cls: string; amber?: boolean }) {
  return (
    <div
      className={`absolute w-4 h-4 ${pos} ${cls}`}
      style={{ borderColor: amber ? 'var(--accent-amber)' : 'white' }}
    />
  )
}
