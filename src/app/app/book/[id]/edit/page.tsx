'use client'
import { useState, useEffect, useRef } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Camera, Link2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book, BookStatus } from '@/types'
import { cn } from '@/lib/utils'
import { getBook, updateBook, deleteBook } from '@/lib/storage'

export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [book, setBook] = useState<Partial<Book>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coverUrlInput, setCoverUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  useEffect(() => {
    const data = getBook(id)
    if (data) { setBook(data); setCoverUrlInput(data.cover ?? '') }
    setLoading(false)
  }, [id])

  const save = () => {
    setSaving(true)
    updateBook(id, book)
    router.push(`/app/book/${id}`)
  }

  const remove = () => {
    if (!confirm('Eliminare questo libro dalla libreria?')) return
    deleteBook(id)
    router.push('/app')
  }

  const handleCoverFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setBook(prev => ({ ...prev, cover: dataUrl }))
      setCoverUrlInput('')
    }
    reader.readAsDataURL(file)
  }

  const applyUrlCover = () => {
    if (coverUrlInput.trim()) {
      setBook(prev => ({ ...prev, cover: coverUrlInput.trim() }))
      setShowUrlInput(false)
    }
  }

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof Book; type?: string }) => (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">{label}</label>
      <input
        type={type}
        value={(book[field] as string | number | undefined) ?? ''}
        onChange={e => setBook(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) || null : e.target.value }))}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
      />
    </div>
  )

  return (
    <div>
      <TopBar title="Modifica libro" back right={
        <button onClick={remove} className="p-2 rounded-full text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={18} />
        </button>
      } />

      {loading ? <div className="p-4 skeleton h-96 rounded-2xl m-4" /> : (
        <div className="px-4 py-4 space-y-4">

          {/* Cover section */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Copertina</label>
            <div className="flex gap-3 items-start">
              <div className="w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--cream-2)' }}>
                {book.cover ? (
                  <img src={book.cover} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">📚</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <button
                  onClick={() => { fileRef.current?.setAttribute('capture', 'environment'); fileRef.current?.click() }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
                  style={{ borderColor: 'var(--line-2)', background: 'var(--cream-2)', color: 'var(--ink)' }}
                >
                  <Camera size={16} /> Scatta foto
                </button>
                <button
                  onClick={() => { fileRef.current?.removeAttribute('capture'); fileRef.current?.click() }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
                  style={{ borderColor: 'var(--line-2)', background: 'var(--cream-2)', color: 'var(--ink)' }}
                >
                  <span>🖼️</span> Galleria
                </button>
                <button
                  onClick={() => setShowUrlInput(v => !v)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95"
                  style={{ borderColor: 'var(--line-2)', background: 'var(--cream-2)', color: 'var(--ink)' }}
                >
                  <Link2 size={16} /> Incolla URL
                </button>
              </div>
            </div>
            {showUrlInput && (
              <div className="flex gap-2 mt-2">
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={e => setCoverUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--cream-2)', border: '1px solid var(--line)' }}
                />
                <button onClick={applyUrlCover} className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
                  OK
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); e.target.value = '' }} />
          </div>

          <Field label="Titolo" field="title" />
          <Field label="Autore" field="author" />
          <Field label="Editore" field="publisher" />
          <Field label="Anno" field="year" type="number" />
          <Field label="ISBN" field="isbn" />
          <Field label="Pagine" field="pages" type="number" />
          <Field label="Genere" field="genre" />
          <Field label="Lingua" field="language" />
          <Field label="Prezzo di acquisto (€)" field="purchasePrice" type="number" />

          {/* Summary */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Riassunto</label>
            <textarea
              value={book.summary ?? ''}
              onChange={e => setBook(prev => ({ ...prev, summary: e.target.value }))}
              rows={4}
              placeholder="Inserisci o modifica il riassunto del libro..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Stato</label>
            <div className="flex gap-2">
              {(['read', 'reading', 'wishlist'] as BookStatus[]).map(s => (
                <button key={s} onClick={() => setBook(prev => ({ ...prev, status: s }))}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-semibold transition-all', book.status === s ? 'text-[var(--cream)]' : 'text-[var(--muted)]')}
                  style={book.status === s ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}>
                  {s === 'read' ? 'Letto' : s === 'reading' ? 'In lettura' : 'Lista desideri'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-2">Note personali</label>
            <textarea
              value={book.notes ?? ''}
              onChange={e => setBook(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            />
          </div>

          <button onClick={save} disabled={saving} className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      )}
    </div>
  )
}
