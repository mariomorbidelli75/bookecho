'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { BookOpen, Check, Library, Store, AlertCircle, CopyCheck } from 'lucide-react'
import type { Book } from '@/types'
import { cn, formatPrice } from '@/lib/utils'
import { createBook, findDuplicates, getBooks, whereIs } from '@/lib/storage'

export interface ShelfResult extends Partial<Book> {
  matched?: boolean
  scannedTitle?: string
  // Provenienza dei campi e campi rimasti vuoti: informazioni di servizio,
  // non finiscono in archivio.
  sources?: Record<string, string>
  missing?: string[]
}

type Dest = 'library' | 'market'

// Revisione dei libri riconosciuti da una foto di scaffale: si scelgono quelli
// da tenere, la destinazione (libreria o mercatino) e un prezzo di partenza.
export function ShelfReview({ results, defaultDest, onRetry }: {
  results: ShelfResult[]
  defaultDest: Dest
  onRetry: () => void
}) {
  const router = useRouter()
  // Confronto una sola volta con l'archivio (libreria + mercatino): i libri che
  // ci sono già partono deselezionati, ma restano selezionabili a mano.
  const [dupes] = useState<Book[][]>(() => {
    const stored = getBooks()
    return results.map(r => findDuplicates(r, stored))
  })
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(results.map((_, i) => i).filter(i => dupes[i].length === 0))
  )
  const [dest, setDest] = useState<Dest>(defaultDest)
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const saveAll = () => {
    if (selected.size === 0) return
    setSaving(true)
    const listingPrice = parseFloat(price.replace(',', '.'))
    const now = new Date().toISOString()

    results.forEach((r, i) => {
      if (!selected.has(i)) return
      const { matched: _matched, scannedTitle: _scannedTitle, sources, missing: _missing, ...data } = r
      createBook({
        ...data,
        summarySource: (sources?.summary as Book['summarySource']) ?? null,
        collection: dest === 'market' ? 'market' : 'library',
        status: dest === 'market' ? 'for-sale' : 'to-read',
        listingPrice: dest === 'market' && !isNaN(listingPrice) ? listingPrice : null,
        listedAt: dest === 'market' ? now : null,
        location: location.trim() || null,
      })
    })

    router.push(dest === 'market' ? '/app/mercatino' : '/app')
  }

  const matchedCount = results.filter(r => r.matched).length
  const dupCount = dupes.filter(d => d.length > 0).length

  return (
    <div className="rounded-t-3xl max-h-[78vh] flex flex-col animate-fade-up" style={{ background: 'var(--cream)' }}>
      <div className="p-5 pb-3">
        <h3 className="font-serif text-lg font-semibold leading-tight">
          {results.length} {results.length === 1 ? 'libro riconosciuto' : 'libri riconosciuti'}
        </h3>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {matchedCount} con scheda completa dal web · deseleziona quelli sbagliati, potrai correggerli dopo.
        </p>
        {dupCount > 0 && (
          <p className="text-xs mt-2 px-3 py-2 rounded-xl flex items-start gap-1.5" style={{ background: 'rgba(232,155,76,0.16)', color: '#8A4B10' }}>
            <CopyCheck size={13} className="flex-shrink-0 mt-0.5" />
            <span>
              {dupCount === 1
                ? '1 libro ce l’hai già: l’ho lasciato deselezionato. Toccalo per aggiungerlo lo stesso come seconda copia.'
                : `${dupCount} libri ce li hai già: li ho lasciati deselezionati. Toccali per aggiungerli lo stesso come seconde copie.`}
            </span>
          </p>
        )}
      </div>

      {/* Elenco riconosciuti */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2">
        {results.map((r, i) => {
          const on = selected.has(i)
          return (
            <button
              key={`${r.title}-${i}`}
              onClick={() => toggle(i)}
              className={cn('w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all border')}
              style={on
                ? { background: 'var(--cream-2)', borderColor: 'var(--forest)' }
                : { background: 'var(--cream)', borderColor: 'var(--line)', opacity: 0.55 }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={on ? { background: 'var(--forest)' } : { border: '1.5px solid var(--line-2)' }}
              >
                {on && <Check size={13} className="text-[var(--cream)]" />}
              </div>
              <div className="w-9 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream-3)' }}>
                {r.cover
                  ? <Image src={r.cover} alt="" width={36} height={48} className="object-cover w-full h-full" unoptimized />
                  : <BookOpen size={14} className="text-[var(--muted)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">{r.title}</p>
                <p className="text-xs text-[var(--muted)] truncate">{r.author}</p>
                {!r.matched && (
                  <p className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: '#B86B1A' }}>
                    <AlertCircle size={10} /> Solo dorso — da completare
                  </p>
                )}
                {dupes[i].length > 0 && (
                  <p className="text-[11px] flex items-center gap-1 mt-0.5 truncate" style={{ color: '#8A4B10' }}>
                    <CopyCheck size={10} className="flex-shrink-0" />
                    Già presente · {whereIs(dupes[i][0])}
                  </p>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Destinazione + salvataggio */}
      <div className="p-5 pt-3 space-y-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="flex gap-2">
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

        <div className="grid grid-cols-2 gap-2">
          {dest === 'market' && (
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Prezzo (€)"
              className="px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          )}
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Posizione (es. Scaffale A)"
            className={cn('px-3 py-2.5 rounded-xl text-sm outline-none', dest === 'market' ? '' : 'col-span-2')}
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          />
        </div>

        {dest === 'market' && price && !isNaN(parseFloat(price.replace(',', '.'))) && (
          <p className="text-xs text-[var(--muted)]">
            Valore inserzionato: {formatPrice(parseFloat(price.replace(',', '.')) * selected.size)}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold border transition-all active:scale-95"
            style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
          >
            Rifai la foto
          </button>
          <button
            onClick={saveAll}
            disabled={saving || selected.size === 0}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
          >
            {saving ? 'Salvataggio…' : `Aggiungi ${selected.size}`}
          </button>
        </div>
      </div>
    </div>
  )
}
