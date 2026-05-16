'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import type { Book, BookStatus } from '@/types'
import { EMOTIONS } from '@/types'
import { cn } from '@/lib/utils'

export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [book, setBook] = useState<Partial<Book>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/books/${id}`).then(r => r.json()).then(data => { setBook(data); setLoading(false) })
  }, [id])

  const save = async () => {
    setSaving(true)
    await fetch(`/api/books/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book),
    })
    router.push(`/app/book/${id}`)
  }

  const remove = async () => {
    if (!confirm('Eliminare questo libro dalla libreria?')) return
    await fetch(`/api/books/${id}`, { method: 'DELETE' })
    router.push('/app')
  }

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof Book; type?: string }) => (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">{label}</label>
      <input
        type={type}
        value={(book[field] as string | number | undefined) ?? ''}
        onChange={e => setBook(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
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
          <Field label="Titolo" field="title" />
          <Field label="Autore" field="author" />
          <Field label="Editore" field="publisher" />
          <Field label="Anno" field="year" type="number" />
          <Field label="ISBN" field="isbn" />
          <Field label="Pagine" field="pages" type="number" />
          <Field label="Genere" field="genre" />
          <Field label="Prezzo di acquisto (€)" field="purchasePrice" type="number" />

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Stato</label>
            <div className="flex gap-2">
              {(['read', 'reading', 'wishlist'] as BookStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setBook(prev => ({ ...prev, status: s }))}
                  className={cn('flex-1 py-2 rounded-xl text-xs font-semibold transition-all', book.status === s ? 'text-[var(--cream)]' : 'text-[var(--muted)]')}
                  style={book.status === s ? { background: 'var(--forest)' } : { background: 'var(--cream-2)' }}
                >
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

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
          >
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      )}
    </div>
  )
}
