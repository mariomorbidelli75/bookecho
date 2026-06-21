'use client'
import { useState, useEffect } from 'react'
import { UserPlus, Share2, BookOpen, Repeat, Sparkles, Trash2, Bell, Users } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { cn, formatRelative } from '@/lib/utils'
import type { Book } from '@/types'
import { getBooks } from '@/lib/storage'
import {
  getFriends, addFriend, removeFriend, matchScore, swapCandidates,
  isSharing, setSharing, inviteUrl, type Friend,
} from '@/lib/social'

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [sharing, setSharingState] = useState(true)
  const [name, setName] = useState('')

  useEffect(() => {
    setFriends(getFriends())
    setBooks(getBooks())
    setSharingState(isSharing())
  }, [])

  const myCurrent = books.find(b => b.status === 'reading')

  const invite = async () => {
    const url = inviteUrl()
    const text = `📚 Ti invito su Librò — tutti i libri in un posto solo. Condividiamo cosa leggiamo e scambiamoci i libri!\n${url}`
    try {
      if (navigator.share) await navigator.share({ title: 'Unisciti a me su Librò', text, url })
      else { await navigator.clipboard.writeText(text); alert('Invito copiato negli appunti!') }
    } catch {}
  }

  const add = () => {
    if (!name.trim()) return
    addFriend(name)
    setFriends(getFriends())
    setName('')
  }

  const remove = (id: string) => {
    removeFriend(id)
    setFriends(getFriends())
  }

  const toggleShare = () => {
    const next = !sharing
    setSharing(next)
    setSharingState(next)
  }

  const proposeSwap = async (friend: Friend) => {
    const mine = swapCandidates(friend, books)
    const offer = mine[0]
    const text = offer
      ? `Ciao ${friend.name}! Ho visto che stai leggendo "${friend.currentBook.title}". Ti va di scambiarcelo? Io ho "${offer.title}" di ${offer.author}. Ci vediamo? 📚`
      : `Ciao ${friend.name}! Ho visto che stai leggendo "${friend.currentBook.title}". Ti va di vederci e scambiarci un libro? 📚`
    try {
      if (navigator.share) await navigator.share({ title: `Scambio con ${friend.name}`, text })
      else { await navigator.clipboard.writeText(text); alert('Messaggio copiato negli appunti!') }
    } catch {}
  }

  return (
    <div className="pb-8">
      <TopBar title="Amici lettori" back />

      <div className="px-4 py-4 space-y-4">
        {/* Invite hero */}
        <div className="p-5 rounded-3xl" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} />
            <h2 className="font-serif text-lg font-semibold">Invita i tuoi amici</h2>
          </div>
          <p className="text-sm opacity-80 mb-4">Scaricano l'app, condividete cosa leggete e vi avvisiamo quando un amico inizia un nuovo libro — così potete vedervi e scambiarvelo.</p>
          <button onClick={invite} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
            <Share2 size={16} /> Condividi l'invito
          </button>
        </div>

        {/* Sharing toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
          <div className="flex items-start gap-3">
            <Bell size={18} style={{ color: 'var(--forest)' }} className="mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Condividi cosa leggi</p>
              <p className="text-xs text-[var(--muted)]">
                {myCurrent ? `Gli amici vedono: "${myCurrent.title}"` : 'Inizia un libro per condividerlo'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleShare}
            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ background: sharing ? 'var(--forest)' : 'var(--line-2)' }}
            aria-label="Attiva condivisione"
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: sharing ? '22px' : '2px' }} />
          </button>
        </div>

        {/* Add friend (demo) */}
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Aggiungi un amico per nome…"
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={!name.trim()} className="px-4 rounded-xl flex items-center gap-1.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            <UserPlus size={16} />
          </button>
        </div>

        {/* Friends feed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Amici iscritti
            </p>
            {friends.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(30,77,58,0.1)', color: 'var(--forest)' }}>
                {friends.length} {friends.length === 1 ? 'iscritto' : 'iscritti'}
              </span>
            )}
          </div>

          {friends.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--cream-2)' }}>
                <Users size={24} className="text-[var(--muted)]" />
              </div>
              <p className="text-sm text-[var(--muted)] max-w-[240px]">Nessun amico collegato. Invita qualcuno o aggiungilo qui sopra per vedere cosa sta leggendo.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {friends.map(f => {
                const score = matchScore(f, books)
                const swaps = swapCandidates(f, books)
                return (
                  <div key={f.id} className="p-4 rounded-2xl border border-[var(--line)] bg-white/60">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm flex-shrink-0" style={{ background: f.color, color: 'white' }}>
                        {f.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm">{f.name}</p>
                          <button onClick={() => remove(f.id)} className="text-[var(--muted)] hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-[var(--muted)]">Iscritto {formatRelative(f.joinedAt)} · attivo {formatRelative(f.updatedAt)}</p>

                        {/* Current book */}
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-xl" style={{ background: 'var(--cream-2)' }}>
                          <BookOpen size={16} style={{ color: 'var(--forest)' }} className="flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{f.currentBook.title}</p>
                            <p className="text-xs text-[var(--muted)] truncate">{f.currentBook.author}</p>
                          </div>
                        </div>

                        {/* Match */}
                        <div className="flex items-center gap-2 mt-2">
                          <Sparkles size={13} style={{ color: 'var(--accent-amber)' }} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--forest)' }}>{score}% affinità</span>
                          <span className="text-xs text-[var(--muted)]">· gusti simili ai tuoi</span>
                        </div>

                        {swaps.length > 0 && (
                          <p className="text-xs text-[var(--muted)] mt-1.5">
                            Puoi proporgli: <span className="text-[var(--ink)] font-medium">{swaps[0].title}</span>
                          </p>
                        )}

                        <button onClick={() => proposeSwap(f)} className="w-full mt-2.5 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
                          <Repeat size={14} /> Proponi scambio · vediamoci
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
