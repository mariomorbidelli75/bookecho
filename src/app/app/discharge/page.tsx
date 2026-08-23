'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Camera, PackageCheck, AlertCircle, BookOpen, Check } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { getLibraryBooks, getBook, updateBook } from '@/lib/storage'

type State = 'scan' | 'form' | 'success' | 'notfound'

const onlyDigits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')
const today = () => new Date().toISOString().slice(0, 10)

declare global {
  interface Window {
    BarcodeDetector: {
      new(opts?: { formats: string[] }): {
        detect(src: HTMLVideoElement | ImageBitmap): Promise<Array<{ rawValue: string; format: string }>>
      }
    }
  }
}

export default function DischargePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastIsbnRef = useRef('')

  const [state, setState] = useState<State>('scan')
  const [book, setBook] = useState<Book | null>(null)
  const [hasBarcode, setHasBarcode] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [manualIsbn, setManualIsbn] = useState('')
  const [scannedIsbn, setScannedIsbn] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(today())

  const stopCamera = useCallback(() => {
    if (rafRef.current) { clearTimeout(rafRef.current); rafRef.current = null }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  // Cerca un libro in libreria a partire dall'ISBN e passa al form.
  const selectFromIsbn = useCallback((isbn: string) => {
    stopCamera()
    const clean = onlyDigits(isbn)
    setScannedIsbn(clean)
    const match = getLibraryBooks().find(b => onlyDigits(b.isbn) === clean && b.status !== 'sold')
      ?? getLibraryBooks().find(b => onlyDigits(b.isbn) === clean)
    if (match) {
      setBook(match)
      setPrice(match.soldPrice != null ? String(match.soldPrice) : '')
      setDate(match.soldAt ? match.soldAt.slice(0, 10) : today())
      setState('form')
    } else {
      setState('notfound')
    }
  }, [stopCamera])

  // Prefill quando si arriva dalla scheda libro (?id=...) — salta la scansione.
  useEffect(() => {
    setHasBarcode(typeof window !== 'undefined' && 'BarcodeDetector' in window)
    const id = new URLSearchParams(window.location.search).get('id')
    if (id) {
      const b = getBook(id)
      if (b) {
        setBook(b)
        setScannedIsbn(onlyDigits(b.isbn))
        setPrice(b.soldPrice != null ? String(b.soldPrice) : '')
        setDate(b.soldAt ? b.soldAt.slice(0, 10) : today())
        setState('form')
      }
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const startCamera = useCallback(async () => {
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
            const v = onlyDigits(code.rawValue)
            if (v !== lastIsbnRef.current && /^\d{10}(\d{3})?$/.test(v)) {
              lastIsbnRef.current = v
              selectFromIsbn(v)
              return
            }
          }
        } catch {}
        rafRef.current = setTimeout(tick, 300)
      }
      tick()
    } catch {
      // permessi negati: resta sull'input manuale
      setCameraActive(false)
    }
  }, [hasBarcode, selectFromIsbn])

  const confirmSale = () => {
    if (!book) return
    const value = parseFloat(price.replace(',', '.'))
    updateBook(book.id, {
      status: 'sold',
      soldPrice: isNaN(value) ? null : value,
      soldAt: new Date(`${date}T12:00:00`).toISOString(),
    })
    setState('success')
  }

  const resetScan = () => {
    lastIsbnRef.current = ''
    setBook(null)
    setManualIsbn('')
    setScannedIsbn('')
    setState('scan')
  }

  // ─────────────────────────────────── SCAN ───────────────────────────────────
  if (state === 'scan') {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: 'var(--ink)' }}>
        <TopBar title="Scarico vendita" back transparent className="text-white" />
        <div className="flex-1 flex flex-col items-center px-5 gap-5 py-4">
          <p className="text-white/60 text-sm text-center max-w-xs">
            Scansiona il codice ISBN del libro venduto per scaricarlo dalla libreria.
          </p>

          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl" style={{ background: '#000', aspectRatio: '16/9' }}>
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-4/5 h-16 border border-white/20 rounded">
                <span className="absolute -top-5 left-0 right-0 text-center text-white/50 text-xs">Centra il codice a barre</span>
                {cameraActive && (
                  <div className="absolute left-0 right-0 h-0.5 animate-scan" style={{ background: 'var(--accent-amber)', boxShadow: '0 0 6px var(--accent-amber)' }} />
                )}
              </div>
            </div>
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl">📦</span>
                <p className="text-white/50 text-xs">Scanner non attivo</p>
              </div>
            )}
          </div>

          {hasBarcode && (
            <button
              onClick={cameraActive ? stopCamera : startCamera}
              className="w-full max-w-sm py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={cameraActive
                ? { background: 'rgba(255,255,255,0.15)', color: 'white' }
                : { background: 'var(--accent-amber)', color: 'var(--ink)' }}
            >
              {cameraActive ? 'Interrompi scanner' : 'Avvia scanner barcode'}
            </button>
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
                onKeyDown={e => e.key === 'Enter' && manualIsbn.length >= 10 && selectFromIsbn(manualIsbn)}
              />
              <button
                onClick={() => selectFromIsbn(manualIsbn)}
                disabled={manualIsbn.length < 10}
                className="px-5 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
                style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}
              >
                Cerca
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────── NOT FOUND ──────────────────────────────
  if (state === 'notfound') {
    return (
      <div>
        <TopBar title="Scarico vendita" back />
        <div className="px-4 py-8 flex flex-col items-center text-center">
          <AlertCircle size={40} className="text-red-500 mb-4" />
          <h2 className="font-serif text-lg font-semibold mb-1">Libro non in libreria</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Nessun libro con ISBN <span className="font-mono">{scannedIsbn}</span> è presente nella tua libreria.
          </p>
          <button
            onClick={resetScan}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-[var(--cream)] transition-all active:scale-95"
            style={{ background: 'var(--forest)' }}
          >
            Scansiona un altro codice
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────── SUCCESS ────────────────────────────────
  if (state === 'success' && book) {
    return (
      <div>
        <TopBar title="Scarico vendita" back />
        <div className="px-4 py-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--forest)' }}>
            <Check size={30} className="text-[var(--cream)]" />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-1">Libro venduto</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            «{book.title}» è stato spostato tra i venduti.
          </p>
          <div className="flex gap-2 w-full max-w-sm">
            <Link
              href="/app?filter=sold"
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-center transition-all active:scale-95"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}
            >
              Vedi i venduti
            </Link>
            <button
              onClick={resetScan}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95"
              style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
            >
              Scarica un altro
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────── FORM ───────────────────────────────────
  if (!book) return null
  const value = parseFloat(price.replace(',', '.'))
  return (
    <div>
      <TopBar title="Scarico vendita" back />
      <div className="px-4 py-4 space-y-4">
        {/* Libro trovato */}
        <div className="flex items-start gap-4 p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
          <div className="w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream-3)' }}>
            {book.cover
              ? <Image src={book.cover} alt="" width={56} height={80} className="object-cover w-full h-full" unoptimized />
              : <BookOpen size={22} className="text-[var(--muted)]" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PackageCheck size={14} style={{ color: 'var(--forest)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--forest)' }}>Da scaricare</span>
            </div>
            <h3 className="font-serif text-lg font-semibold leading-tight">{book.title}</h3>
            <p className="text-sm text-[var(--muted)]">{book.author}</p>
            {book.isbn && <p className="text-xs font-mono text-[var(--muted)] mt-0.5">ISBN {book.isbn}</p>}
          </div>
        </div>

        {book.status === 'sold' && (
          <p className="text-xs text-[#B86B1A] px-1">Questo libro risulta già venduto. Confermando aggiornerai i dati di vendita.</p>
        )}

        {/* Valore di vendita */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Valore di vendita (€)</label>
          <input
            type="number"
            inputMode="decimal"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="Es. 18.50"
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        {/* Data di vendita */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Data di vendita</label>
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        {/* Riepilogo */}
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
          <span className="text-sm font-medium opacity-80">Incasso vendita</span>
          <span className="font-serif text-2xl font-semibold">{!isNaN(value) ? formatPrice(value) : '—'}</span>
        </div>

        <button
          onClick={confirmSale}
          className={cn('w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95')}
          style={{ background: 'var(--forest)', color: 'var(--cream)' }}
        >
          Conferma vendita e archivia
        </button>
      </div>
    </div>
  )
}
