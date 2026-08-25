'use client'
import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Camera, MapPin, Tag, PackageCheck, Trash2, Undo2, Library, Check } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { CompleteSheet } from '@/components/CompleteSheet'
import type { Book } from '@/types'
import { BOOK_CONDITIONS, SALE_CHANNELS } from '@/types'
import { cn, compressImage, formatDate, formatPrice } from '@/lib/utils'
import { getBook, updateBook, deleteBook, markAsSold, moveToLibrary } from '@/lib/storage'

const today = () => new Date().toISOString().slice(0, 10)
const toNumber = (s: string): number | null => {
  const v = parseFloat(s.replace(',', '.'))
  return isNaN(v) ? null : v
}

// Fuori dal componente: se definito dentro, ogni keystroke rimonta l'input e
// la tastiera mobile si chiude.
function Field({ label, field, type = 'text', placeholder, book, setBook }: {
  label: string
  field: keyof Book
  type?: string
  placeholder?: string
  book: Partial<Book>
  setBook: React.Dispatch<React.SetStateAction<Partial<Book>>>
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">{label}</label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        placeholder={placeholder}
        value={(book[field] as string | number | undefined) ?? ''}
        onChange={e => setBook(prev => ({
          ...prev,
          [field]: type === 'number' ? (Number(e.target.value) || null) : e.target.value,
        }))}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
      />
    </div>
  )
}

export default function MarketBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const shelfRef = useRef<HTMLInputElement>(null)

  const [book, setBook] = useState<Partial<Book>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  // Form vendita
  const [showSale, setShowSale] = useState(false)
  const [salePrice, setSalePrice] = useState('')
  const [saleDate, setSaleDate] = useState(today())
  const [saleChannel, setSaleChannel] = useState('')

  useEffect(() => {
    const data = getBook(id)
    if (data) {
      setBook(data)
      setSalePrice(data.soldPrice != null ? String(data.soldPrice) : data.listingPrice != null ? String(data.listingPrice) : '')
      setSaleDate(data.soldAt ? data.soldAt.slice(0, 10) : today())
      setSaleChannel(data.soldChannel ?? '')
    }
    setLoading(false)
  }, [id])

  const save = () => {
    updateBook(id, book)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const confirmSale = () => {
    updateBook(id, book)
    const updated = markAsSold(id, { price: toNumber(salePrice), date: saleDate, channel: saleChannel })
    if (updated) setBook(updated)
    setShowSale(false)
  }

  const reopenSale = () => {
    const updated = updateBook(id, { status: 'for-sale', soldPrice: null, soldAt: null, soldChannel: null })
    if (updated) setBook(updated)
  }

  const backToLibrary = () => {
    moveToLibrary(id)
    router.push(`/app/book/${id}`)
  }

  const remove = () => {
    if (!confirm('Eliminare definitivamente questo libro dal mercatino?')) return
    deleteBook(id)
    router.push('/app/mercatino')
  }

  const handleShelfFile = async (file: File) => {
    const dataUrl = await compressImage(file)
    setBook(prev => ({ ...prev, locationPhoto: dataUrl }))
  }

  if (loading) return <div className="p-4 space-y-4"><div className="skeleton h-40 rounded-3xl" /><div className="skeleton h-64 rounded-2xl" /></div>

  if (!book.id) return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-8">
      <BookOpen size={40} className="text-[var(--muted)] mb-4" />
      <h2 className="font-serif text-xl font-semibold">Libro non trovato</h2>
    </div>
  )

  const sold = book.status === 'sold'
  const margin = book.soldPrice != null && book.purchasePrice != null ? book.soldPrice - book.purchasePrice : null

  return (
    <div>
      <TopBar title="Scheda mercatino" back right={
        <button onClick={remove} className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={18} />
        </button>
      } />

      <div className="px-4 py-4 space-y-4">
        {/* Intestazione libro */}
        <div className="flex gap-4 p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
          <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream-3)' }}>
            {book.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover} alt="" className="w-full h-full object-cover" />
            ) : <span className="text-2xl">📚</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-lg font-semibold leading-tight">{book.title}</h1>
            <p className="text-sm text-[var(--muted)]">{book.author}</p>
            {book.isbn && <p className="text-xs font-mono text-[var(--muted)] mt-0.5">ISBN {book.isbn}</p>}
            <Link href={`/app/book/${id}/edit`} className="inline-block mt-2 text-xs font-semibold underline" style={{ color: 'var(--forest)' }}>
              Modifica scheda completa
            </Link>
          </div>
        </div>

        {/* Campi mancanti: si ripescano dai cataloghi su richiesta */}
        {book.id && <CompleteSheet book={book as Book} onUpdated={setBook} />}

        {/* Banner venduto */}
        {sold && (
          <div className="p-4 rounded-2xl" style={{ background: 'var(--forest-darker)', color: 'var(--cream)' }}>
            <div className="flex items-center gap-3">
              <PackageCheck size={22} className="flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Venduto</p>
                <p className="font-serif text-2xl font-semibold leading-tight">
                  {book.soldPrice != null ? formatPrice(book.soldPrice) : '—'}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {[book.soldChannel, book.soldAt ? formatDate(book.soldAt) : null].filter(Boolean).join(' · ') || 'Dati vendita incompleti'}
                </p>
                {margin != null && (
                  <p className="text-xs opacity-80 mt-1">
                    Guadagno netto {formatPrice(margin)} (acquisto {formatPrice(book.purchasePrice ?? 0)})
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={reopenSale}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(245,241,232,0.15)', color: 'var(--cream)' }}
            >
              <Undo2 size={14} /> Annulla vendita e rimetti in vendita
            </button>
          </div>
        )}

        {/* Dati inserzione */}
        <div className="p-3 rounded-2xl space-y-3" style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <Tag size={15} style={{ color: 'var(--forest)' }} />
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Inserzione</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Prezzo inserzione (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={book.listingPrice ?? ''}
                onChange={e => setBook(prev => ({ ...prev, listingPrice: Number(e.target.value) || null }))}
                placeholder="Es. 12.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Costo acquisto (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={book.purchasePrice ?? ''}
                onChange={e => setBook(prev => ({ ...prev, purchasePrice: Number(e.target.value) || null }))}
                placeholder="Es. 3.00"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>
          </div>

          {/* Condizione */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1.5">Condizione</label>
            <div className="flex flex-wrap gap-1.5">
              {BOOK_CONDITIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setBook(prev => ({ ...prev, condition: prev.condition === c ? null : c }))}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                    book.condition === c ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]')}
                  style={book.condition === c ? { background: 'var(--forest)' } : { background: 'var(--cream)' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dati bibliografici utili in ricerca */}
        <div className="space-y-3">
          <Field label="Casa editrice" field="publisher" placeholder="Es. Adelphi" book={book} setBook={setBook} />
          <Field label="Edizione / collana" field="edition" placeholder="Es. 1ª ed. Oscar Mondadori" book={book} setBook={setBook} />
          <Field label="Anno" field="year" type="number" book={book} setBook={setBook} />
        </div>

        {/* Posizione fisica */}
        <div className="p-3 rounded-2xl space-y-3" style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
          <div className="flex items-center gap-2">
            <MapPin size={15} style={{ color: 'var(--forest)' }} />
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Dove l&apos;ho messo</label>
          </div>
          <input
            type="text"
            value={book.location ?? ''}
            onChange={e => setBook(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Es. Scatolone B — bancarella domenica"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
          <div className="flex gap-3 items-start">
            <div className="w-24 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream)' }}>
              {book.locationPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.locationPhoto} alt="Posizione" className="w-full h-full object-cover" />
              ) : <span className="text-2xl">📦</span>}
            </div>
            <div className="flex-1 space-y-2">
              <button
                onClick={() => { shelfRef.current?.setAttribute('capture', 'environment'); shelfRef.current?.click() }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
                style={{ borderColor: 'var(--line-2)', background: 'var(--cream)', color: 'var(--ink)' }}
              >
                <Camera size={16} /> Foto posizione
              </button>
              {book.locationPhoto && (
                <button
                  onClick={() => setBook(prev => ({ ...prev, locationPhoto: null }))}
                  className="w-full py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95"
                  style={{ borderColor: 'var(--line-2)', background: 'var(--cream)', color: 'var(--muted)' }}
                >
                  Rimuovi foto
                </button>
              )}
            </div>
          </div>
          <input
            ref={shelfRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleShelfFile(f); e.target.value = '' }}
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Note</label>
          <textarea
            value={book.notes ?? ''}
            onChange={e => setBook(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
            placeholder="Difetti, dedica, provenienza…"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        <button
          onClick={save}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'var(--forest)', color: 'var(--cream)' }}
        >
          {saved ? <><Check size={16} /> Salvato</> : 'Salva scheda'}
        </button>

        {/* Vendita */}
        {!sold && (
          showSale ? (
            <div className="p-4 rounded-2xl space-y-3 animate-fade-up" style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}>
              <p className="font-serif text-base font-semibold">Registra la vendita</p>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Prezzo di vendita (€)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  placeholder="Es. 10.00"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Data di vendita</label>
                <input
                  type="date"
                  value={saleDate}
                  max={today()}
                  onChange={e => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
                <p className="text-[11px] text-[var(--muted)] mt-1">Impostata automaticamente a oggi, modificabile.</p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1.5">Dove l&apos;ho venduto</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SALE_CHANNELS.map(c => (
                    <button
                      key={c}
                      onClick={() => setSaleChannel(c)}
                      className={cn('px-2.5 py-1 rounded-full text-xs font-semibold transition-all',
                        saleChannel === c ? 'text-[var(--cream)]' : 'text-[var(--muted)] border border-[var(--line)]')}
                      style={saleChannel === c ? { background: 'var(--forest)' } : { background: 'var(--cream)' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={saleChannel}
                  onChange={e => setSaleChannel(e.target.value)}
                  placeholder="…oppure scrivi il luogo esatto"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--cream)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowSale(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95"
                  style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
                >
                  Annulla
                </button>
                <button
                  onClick={confirmSale}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                  style={{ background: 'var(--forest)', color: 'var(--cream)' }}
                >
                  Conferma vendita
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSale(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}
            >
              <PackageCheck size={18} /> Segna come venduto
            </button>
          )
        )}

        <button
          onClick={backToLibrary}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95"
          style={{ borderColor: 'var(--line-2)', color: 'var(--muted)' }}
        >
          <Library size={16} /> Sposta nella mia libreria
        </button>
      </div>
    </div>
  )
}
