'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Upload, Zap, AlertCircle, Search, Library, Store, CopyCheck } from 'lucide-react'
import Image from 'next/image'
import { TopBar } from '@/components/TopBar'
import { ShelfReview, type ShelfResult } from '@/components/ShelfReview'
import { cn, fileToBase64, compressDataUrl } from '@/lib/utils'
import type { Book } from '@/types'
import { createBook, findDuplicates, whereIs, bookHref } from '@/lib/storage'

// La risposta di /api/scan e /api/isbn porta anche la provenienza dei campi:
// serve a dire all'utente da dove arrivano copertina e trama.
type ScanResultData = Partial<Book> & {
  sources?: Record<string, string>
  missing?: string[]
  warning?: string
  fromCache?: boolean
}

const SOURCE_LABELS: Record<string, string> = {
  google: 'Google Books',
  openlibrary: 'Open Library',
  wikipedia: 'Wikipedia',
  ai: 'sintesi AI',
  photo: 'la tua foto',
}

type ScanState = 'idle' | 'scanning' | 'found' | 'error' | 'manual' | 'shelf-review'
type ScanMode = 'cover' | 'barcode' | 'shelf'
type Dest = 'library' | 'market'

declare global {
  interface Window {
    BarcodeDetector: {
      new(opts?: { formats: string[] }): {
        detect(src: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string; format: string }>>
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
  const [result, setResult] = useState<ScanResultData | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [hasBarcode, setHasBarcode] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  // Destinazione del libro: libreria personale o mercatino
  const [dest, setDest] = useState<Dest>('library')
  const [listPrice, setListPrice] = useState('')
  const [shelfResults, setShelfResults] = useState<ShelfResult[]>([])
  const [shelfAvailable, setShelfAvailable] = useState<boolean | null>(null)


  useEffect(() => {
    setHasBarcode(typeof window !== 'undefined' && 'BarcodeDetector' in window)
    // Arrivando da "+" nel mercatino la destinazione è già impostata
    if (new URLSearchParams(window.location.search).get('dest') === 'market') {
      setDest('market')
    }
    // La scansione libreria richiede una chiave di visione lato server
    fetch('/api/scan/shelf')
      .then(r => r.json())
      .then(d => setShelfAvailable(Boolean(d.available)))
      .catch(() => setShelfAvailable(null))
  }, [])

  // Copie dello stesso libro già in libreria o nel mercatino. Si ricava dal
  // risultato: senza risultato non c'è nulla da confrontare.
  const duplicates: Book[] = result ? findDuplicates(result) : []

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

  // Scansione libreria: una foto → tanti libri letti dai dorsi
  const handleShelfImage = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file)
    setPreview(base64)
    setState('scanning')
    setError('')
    try {
      const res = await fetch('/api/scan/shelf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (!res.ok || data.error || !data.books?.length) {
        setState('error')
        setError(data.error ?? 'Nessun libro riconosciuto nella foto.')
        return
      }
      setShelfResults(data.books)
      setState('shelf-review')
    } catch {
      setState('error')
      setError('Errore di connessione durante la scansione.')
    }
  }, [])

  const handleImage = useCallback(async (file: File) => {
    const base64 = await fileToBase64(file)
    setPreview(base64)
    setState('scanning')
    setError('')

    // 1. Try BarcodeDetector on the static image (Chrome/Android, no library needed)
    if ('BarcodeDetector' in window) {
      try {
        const bitmap = await createImageBitmap(file)
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39'] })
        const codes = await detector.detect(bitmap)
        bitmap.close()
        for (const code of codes) {
          const v = code.rawValue.replace(/[-\s]/g, '')
          if (/^\d{10}(\d{3})?$/.test(v)) {
            await handleIsbn(v)
            return
          }
        }
      } catch {}
    }

    // 2. Try AI scan (requires ANTHROPIC_API_KEY)
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const data = await res.json()
      if (!data.error && data.title) {
        setResult(data)
        setState('found')
        return
      }
    } catch {}

    // 3. Fallback: let the user search by title/author
    setState('manual')
  }, [handleIsbn])

  // Search Google Books by title/author (free, no key for basic use)
  const searchByTitle = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    setError('')
    try {
      const params = new URLSearchParams({ q: searchQuery, maxResults: '5' })
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
      const data = await res.json()
      const items: Array<{ volumeInfo: {
        title: string; authors?: string[]; publisher?: string; publishedDate?: string
        description?: string; pageCount?: number; categories?: string[]
        imageLinks?: { thumbnail?: string; smallThumbnail?: string }
        industryIdentifiers?: Array<{ type: string; identifier: string }>
        language?: string
      } }> = data.items ?? []

      if (items.length === 0) {
        setError('Nessun risultato. Prova con un titolo diverso o aggiungi l\'autore.')
        setSearching(false)
        return
      }

      const info = items[0].volumeInfo
      const rawThumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null
      const cover = rawThumb ? rawThumb.replace('http:', 'https:').replace('zoom=1', 'zoom=3') : undefined
      const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
        ?? info.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier

      setResult({
        title: info.title,
        author: info.authors?.join(', ') ?? 'Autore sconosciuto',
        isbn,
        publisher: info.publisher ?? undefined,
        year: info.publishedDate ? parseInt(info.publishedDate) : undefined,
        cover,
        summary: info.description ?? undefined,
        pages: info.pageCount ?? undefined,
        genre: info.categories?.[0] ?? undefined,
        language: info.language ?? undefined,
      })
      setState('found')
    } catch {
      setError('Errore di connessione.')
    } finally {
      setSearching(false)
    }
  }

  const saveBook = async () => {
    if (!result) return
    setSaving(true)

    // I campi di servizio della risposta (provenienza, campi mancanti) non
    // vanno in archivio: resta solo la fonte della trama, che va dichiarata.
    const { sources, missing: _missing, found: _found, confidence: _confidence, warning: _warning, fromCache: _fromCache, ...clean } =
      result as Partial<Book> & {
        sources?: Record<string, string>; missing?: string[]
        found?: boolean; confidence?: number; warning?: string; fromCache?: boolean
      }

    const data: Partial<Book> = { ...clean }
    if (sources?.summary) data.summarySource = sources.summary as Book['summarySource']

    // Nessun catalogo ha la copertina: meglio la foto appena scattata di un
    // riquadro vuoto. Va compressa, altrimenti riempie da sola localStorage.
    if (!data.cover && preview) {
      try {
        data.cover = await compressDataUrl(preview)
      } catch {}
    }

    if (dest === 'market') {
      const price = parseFloat(listPrice.replace(',', '.'))
      const book = createBook({
        ...data,
        collection: 'market',
        status: 'for-sale',
        listingPrice: isNaN(price) ? null : price,
        listedAt: new Date().toISOString(),
      })
      router.push(`/app/mercatino/${book.id}`)
      return
    }
    const book = createBook({ ...data, collection: 'library', status: 'read' })
    router.push(`/app/book/${book.id}`)
  }

  const reset = useCallback(() => {
    stopCamera()
    setState('idle')
    setPreview(null)
    setResult(null)
    setError('')
    setManualIsbn('')
    setSearchQuery('')
    setShelfResults([])
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
        <>
          <div className="flex mx-4 mt-1 p-1 rounded-2xl gap-1" style={{ background: 'rgba(255,255,255,0.1)' }}>
            {(['cover', 'barcode', 'shelf'] as ScanMode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={mode === m ? { background: 'var(--accent-amber)', color: 'var(--ink)' } : { color: 'rgba(255,255,255,0.6)' }}
              >
                {m === 'cover' ? '📷 Copertina' : m === 'barcode' ? '📊 ISBN' : '📚 Libreria'}
              </button>
            ))}
          </div>

          {/* Destinazione: libreria personale o mercatino */}
          <div className="mx-4 mt-3">
            <p className="text-white/50 text-[11px] mb-1.5">Dove finisce il libro</p>
            <div className="flex gap-2">
              {([
                { value: 'library' as Dest, label: 'La mia libreria', icon: Library },
                { value: 'market' as Dest, label: 'Il mio mercatino', icon: Store },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setDest(value)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={dest === value
                    ? { background: 'var(--cream)', color: 'var(--ink)' }
                    : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">

        {/* COVER / SHELF MODE — preview or viewfinder */}
        {(mode === 'cover' || mode === 'shelf') && state !== 'shelf-review' && (
          preview ? (
            <div className="relative w-full h-full max-h-[50vh]">
              <Image src={preview} alt="Preview" fill className="object-contain" />
              {state === 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                  <Dots />
                  <p className="text-white text-sm font-medium mt-2">
                    {mode === 'shelf' ? 'Leggo i dorsi dei libri…' : 'Analisi in corso…'}
                  </p>
                  {mode === 'shelf' && (
                    <p className="text-white/50 text-xs mt-1">Può richiedere qualche secondo</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className={cn('relative mb-8', mode === 'shelf' ? 'w-64 h-40' : 'w-48 h-64')}>
                <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-white/30" />
                <Corner pos="top-0 left-0" cls="border-t-2 border-l-2 rounded-tl-lg" />
                <Corner pos="top-0 right-0" cls="border-t-2 border-r-2 rounded-tr-lg" />
                <Corner pos="bottom-0 left-0" cls="border-b-2 border-l-2 rounded-bl-lg" />
                <Corner pos="bottom-0 right-0" cls="border-b-2 border-r-2 rounded-br-lg" />
                <div className="absolute left-0 right-0 h-0.5 animate-scan" style={{ background: 'var(--accent-amber)', boxShadow: '0 0 8px var(--accent-amber)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  {mode === 'shelf'
                    ? <span className="text-4xl opacity-50">📚</span>
                    : <Camera size={40} className="text-white/40" />}
                </div>
              </div>
              <p className="text-white/70 text-sm max-w-xs">
                {mode === 'shelf'
                  ? 'Fotografa lo scaffale con i dorsi ben visibili: riconosco tutti i libri in una volta sola.'
                  : 'Fotografa la copertina o il retro con il codice a barre'}
              </p>
              {mode === 'shelf' && shelfAvailable === false && (
                <p className="mt-4 px-4 py-2.5 rounded-xl text-xs max-w-xs" style={{ background: 'rgba(232,155,76,0.18)', color: 'var(--accent-amber-soft)' }}>
                  Riconoscimento non ancora attivo: serve la chiave <span className="font-mono">ANTHROPIC_API_KEY</span> (o <span className="font-mono">GOOGLE_CLOUD_VISION_API_KEY</span>) nelle variabili d&apos;ambiente del progetto.
                </p>
              )}
            </div>
          )
        )}

        {/* BARCODE MODE */}
        {mode === 'barcode' && state === 'idle' && (
          <div className="w-full flex flex-col items-center px-5 gap-5 py-4">

            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl" style={{ background: '#000', aspectRatio: '16/9' }}>
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-4/5 h-16">
                  <div className="absolute inset-0 border border-white/20 rounded" />
                  <span className="absolute -top-5 left-0 right-0 text-center text-white/50 text-xs">Centra il codice a barre</span>
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
                Il tuo browser non supporta la scansione barcode. Usa l&apos;input manuale qui sotto.
              </p>
            )}

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

        {/* Scanning spinner */}
        {state === 'scanning' && mode === 'barcode' && (
          <div className="flex flex-col items-center justify-center gap-4">
            <Dots />
            <p className="text-white text-sm font-medium">Ricerca libro in corso…</p>
          </div>
        )}
      </div>

      {/* FOUND panel */}
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
              {result.publisher && <p className="text-xs text-[var(--muted)] truncate">🏛️ {result.publisher}{result.year ? ` · ${result.year}` : ''}</p>}
              {!result.publisher && result.year && <p className="text-xs text-[var(--muted)]">{result.year}</p>}
              {result.isbn && <p className="text-xs font-mono text-[var(--muted)]">ISBN {result.isbn}</p>}
            </div>
          </div>

          {/* Una fonte muta non è un libro senza dati: si dice e si può riprovare */}
          {result.warning && (
            <p className="text-[11px] leading-snug mb-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(232,155,76,0.16)', color: '#8A4B10' }}>
              {result.warning}
            </p>
          )}

          {/* Da dove arrivano i dati, e cosa non è stato trovato */}
          {(result.sources || result.missing?.length) && (
            <p className="text-[11px] leading-snug text-[var(--muted)] mb-3">
              {[
                result.sources?.cover ? `Copertina da ${SOURCE_LABELS[result.sources.cover] ?? result.sources.cover}` : null,
                result.sources?.summary ? `trama da ${SOURCE_LABELS[result.sources.summary] ?? result.sources.summary}` : null,
              ].filter(Boolean).join(' · ')}
              {result.missing?.includes('cover') && !preview ? ' · copertina non trovata' : ''}
              {result.missing?.includes('cover') && preview ? ' · nessuna copertina nei cataloghi: uso la tua foto' : ''}
              {result.missing?.includes('summary') ? ' · trama non trovata, potrai completarla dalla scheda' : ''}
            </p>
          )}

          {/* Avviso duplicati: il libro risulta già in libreria o nel mercatino */}
          {duplicates.length > 0 && (
            <div className="rounded-2xl p-3 mb-3" style={{ background: 'rgba(232,155,76,0.16)', border: '1px solid rgba(232,155,76,0.45)' }}>
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: '#8A4B10' }}>
                <CopyCheck size={13} />
                {duplicates.length === 1 ? 'Questo libro ce l’hai già' : `Di questo libro hai già ${duplicates.length} copie`}
              </p>
              <div className="space-y-1 mb-2">
                {duplicates.slice(0, 3).map(d => (
                  <button
                    key={d.id}
                    onClick={() => router.push(bookHref(d))}
                    className="w-full flex items-center justify-between gap-2 text-[11px] text-left"
                    style={{ color: 'var(--ink-2)' }}
                  >
                    <span className="truncate">{whereIs(d)}{d.location ? ` · ${d.location}` : ''}</span>
                    <span className="flex-shrink-0 underline" style={{ color: 'var(--forest)' }}>Apri</span>
                  </button>
                ))}
                {duplicates.length > 3 && (
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>e altre {duplicates.length - 3}…</p>
                )}
              </div>
              <p className="text-[11px] leading-snug" style={{ color: 'var(--muted)' }}>
                Aggiungilo di nuovo solo se è una seconda copia o un’altra edizione.
              </p>
            </div>
          )}

          {/* Destinazione */}
          <div className="flex gap-2 mb-3">
            {([
              { value: 'library' as Dest, label: 'Libreria', icon: Library },
              { value: 'market' as Dest, label: 'Mercatino', icon: Store },
            ]).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setDest(value)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={dest === value
                  ? { background: 'var(--forest)', color: 'var(--cream)' }
                  : { background: 'var(--cream-2)', color: 'var(--muted)' }}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {dest === 'market' && (
            <input
              type="number"
              inputMode="decimal"
              value={listPrice}
              onChange={e => setListPrice(e.target.value)}
              placeholder="Prezzo di inserzione (€)"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none mb-3"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          )}

          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
              {duplicates.length > 0 ? 'Non aggiungerlo' : 'Riprova'}
            </button>
            <button
              onClick={saveBook}
              disabled={saving}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={duplicates.length > 0
                ? { background: 'var(--accent-amber)', color: 'var(--ink)' }
                : { background: 'var(--forest)', color: 'var(--cream)' }}
            >
              {saving ? 'Salvataggio…' : duplicates.length > 0 ? 'Aggiungi comunque' : dest === 'market' ? 'Metti in vendita' : 'Aggiungi alla libreria'}
            </button>
          </div>
        </div>
      )}

      {/* SHELF REVIEW — libri riconosciuti dalla foto dello scaffale */}
      {state === 'shelf-review' && (
        <ShelfReview results={shelfResults} defaultDest={dest} onRetry={reset} />
      )}

      {/* MANUAL search panel — shown when automatic recognition fails */}
      {state === 'manual' && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Search size={16} style={{ color: 'var(--forest)' }} />
            <p className="font-semibold text-sm">Ricerca manuale</p>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">Riconoscimento automatico non riuscito. Inserisci il titolo e/o l&apos;autore:</p>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Es. Il nome della rosa Umberto Eco"
            autoFocus
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none mb-3"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onKeyDown={e => e.key === 'Enter' && searchByTitle()}
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
              Riprova foto
            </button>
            <button
              onClick={searchByTitle}
              disabled={searching || !searchQuery.trim()}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}
            >
              {searching ? 'Cerco…' : 'Cerca'}
            </button>
          </div>
        </div>
      )}

      {/* ERROR panel */}
      {state === 'error' && (
        <div className="rounded-t-3xl p-5 animate-fade-up" style={{ background: 'var(--cream)' }}>
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
              Riprova
            </button>
            <button
              onClick={() => { setError(''); setState('manual') }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}
            >
              Cerca manuale
            </button>
          </div>
        </div>
      )}

      {/* Controls — foto copertina e foto scaffale */}
      {(mode === 'cover' || mode === 'shelf') && state === 'idle' && (
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
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) (mode === 'shelf' ? handleShelfImage(f) : handleImage(f))
          e.target.value = ''
        }}
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
