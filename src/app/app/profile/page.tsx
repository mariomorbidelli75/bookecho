'use client'
import { useState, useEffect, useRef } from 'react'
import { BookOpen, Star, TrendingUp, Zap, ChevronRight, Gift, Users, Camera, Check, Pencil } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { TopBar } from '@/components/TopBar'
import type { Book } from '@/types'
import { formatPrice, compressImageSquare } from '@/lib/utils'
import { getBooks } from '@/lib/storage'
import { getMyName, setMyName, getMyAvatar, setMyAvatar, getFriends } from '@/lib/social'

export default function ProfilePage() {
  const [books, setBooks] = useState<Book[]>([])
  const [name, setName] = useState('Mario')
  const [editingName, setEditingName] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [friendCount, setFriendCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBooks(getBooks())
    setName(getMyName())
    setAvatar(getMyAvatar())
    setFriendCount(getFriends().length)
  }, [])

  const handleAvatar = async (file: File) => {
    const dataUrl = await compressImageSquare(file, 400)
    setMyAvatar(dataUrl)
    setAvatar(dataUrl)
  }

  const saveName = () => {
    setMyName(name.trim() || 'Mario')
    setName(name.trim() || 'Mario')
    setEditingName(false)
  }

  const read = books.filter(b => b.status === 'read')
  const avgRating = read.filter(b => b.rating).reduce((a, b) => a + (b.rating ?? 0), 0) / (read.filter(b => b.rating).length || 1)
  const totalValue = books.reduce((a, b) => a + (b.marketData?.avg ?? 0), 0)
  const topEmotion = (() => {
    const count: Record<string, number> = {}
    books.flatMap(b => b.emotions ?? []).forEach(e => { count[e] = (count[e] ?? 0) + 1 })
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0]
  })()

  const STATS = [
    { icon: BookOpen, label: 'Libri letti', value: read.length, color: 'var(--forest)' },
    { icon: Star, label: 'Media voto', value: avgRating.toFixed(1), color: 'var(--accent-amber)' },
    { icon: TrendingUp, label: 'Valore totale', value: formatPrice(totalValue), color: '#4A8B6F' },
    { icon: Zap, label: 'Emozione top', value: topEmotion ?? '—', color: '#9B59B6' },
  ]

  return (
    <div>
      <TopBar title="Profilo" />
      <div className="px-4 py-6 space-y-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-serif text-2xl font-bold flex-shrink-0 transition-all active:scale-95"
            style={{ background: 'var(--forest)', color: 'var(--cream)' }}
            aria-label="Cambia immagine profilo"
          >
            {avatar ? (
              <Image src={avatar} alt="" fill className="object-cover" unoptimized />
            ) : (
              name.charAt(0).toUpperCase()
            )}
            <span className="absolute bottom-0 inset-x-0 flex items-center justify-center py-0.5" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <Camera size={12} className="text-white" />
            </span>
          </button>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  className="font-serif text-lg font-semibold bg-transparent border-b outline-none w-full"
                  style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}
                />
                <button onClick={saveName} className="text-[var(--forest)] flex-shrink-0"><Check size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5">
                <h2 className="font-serif text-lg font-semibold">{name}</h2>
                <Pencil size={13} className="text-[var(--muted)]" />
              </button>
            )}
            <p className="text-sm text-[var(--muted)]">Collezionista di libri</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = '' }}
        />
        <div className="grid grid-cols-2 gap-2">
          {STATS.map(s => (
            <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <s.icon size={18} style={{ color: s.color }} />
              <p className="font-serif text-xl font-semibold mt-2 leading-none">{s.value}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Social — regala e invita */}
        <div className="space-y-2">
          {[
            { href: '/app/gift', icon: Gift, title: 'Regala a un amico', desc: 'Paga tu il primo anno di abbonamento', color: 'var(--accent-amber)' },
            { href: '/app/friends', icon: Users, title: 'Invita un amico', desc: friendCount > 0 ? `${friendCount} ${friendCount === 1 ? 'amico iscritto' : 'amici iscritti'} · condividete le letture` : 'Condividete le letture e scambiatevi i libri', color: 'var(--forest)' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--line)] transition-all active:scale-[0.98] bg-white">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: item.color, color: item.color === 'var(--forest)' ? 'var(--cream)' : 'var(--ink)' }}>
                <item.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--muted)] flex-shrink-0" />
            </Link>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden border border-[var(--line)]">
          {[
            { label: 'Libri in archivio', desc: `${books.length} libri salvati` },
            { label: 'Archiviazione', desc: 'Locale (questo dispositivo)' },
            { label: 'Librò', desc: 'tutti i libri in un posto solo · v1.0' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--line)] last:border-none" style={{ background: 'white' }}>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-[var(--muted)]">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
