'use client'
import { useState, useEffect } from 'react'
import { Share2, BookOpen, Repeat, Sparkles, Trash2, Bell, Users, LogOut, Copy } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { formatRelative } from '@/lib/utils'
import type { Book } from '@/types'
import { getLibraryBooks } from '@/lib/storage'
import { matchScore, swapCandidates, type Friend } from '@/lib/social'
import { AuthForm } from '@/components/AuthForm'
import {
  currentUserId, getMyProfile, updateMyProfile, fetchFriends, unfriend,
  syncMyReading, consumePendingInvite, signOut, inviteLink, type MyProfile,
} from '@/lib/account'
import { supabase } from '@/lib/supabase'

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const lib = getLibraryBooks()
    setBooks(lib)
    if (!(await currentUserId())) { setLoggedIn(false); return }
    setLoggedIn(true)
    try {
      await consumePendingInvite()
      await syncMyReading(lib)
      const [p, f] = await Promise.all([getMyProfile(), fetchFriends()])
      setProfile(p)
      setFriends(f)
      setError(null)
    } catch {
      setError('Non riesco a caricare gli amici. Controlla la connessione.')
    }
  }

  useEffect(() => {
    load()
    // Si aggiorna anche quando l'utente conferma l'email da un altro tab
    const sub = supabase?.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') load() })
    return () => sub?.data.subscription.unsubscribe()
  }, [])

  const myCurrent = books.find(b => b.status === 'reading')
  const sharing = profile?.sharing ?? true

  const invite = async () => {
    if (!profile) return
    const url = inviteLink(profile.ref_code)
    const text = `📚 Ti invito su Librò — tutti i libri in un posto solo. Installala, registrati e ci vediamo tra gli amici lettori!\n${url}`
    try {
      if (navigator.share) await navigator.share({ title: 'Unisciti a me su Librò', text, url })
      else { await navigator.clipboard.writeText(text); alert('Invito copiato negli appunti!') }
    } catch {}
  }

  const copyLink = async () => {
    if (!profile) return
    try { await navigator.clipboard.writeText(inviteLink(profile.ref_code)); alert('Link copiato!') } catch {}
  }

  const remove = async (id: string) => {
    if (!confirm('Togliere questo amico dalla tua lista?')) return
    await unfriend(id)
    setFriends(friends.filter(f => f.id !== id))
  }

  const toggleShare = async () => {
    if (!profile) return
    const next = !sharing
    setProfile({ ...profile, sharing: next })
    await updateMyProfile({ sharing: next })
  }

  const logout = async () => {
    await signOut()
    setProfile(null)
    setFriends([])
    setLoggedIn(false)
  }

  const proposeSwap = async (friend: Friend) => {
    const mine = swapCandidates(friend, books)
    const offer = mine[0]
    if (!friend.currentBook) return
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
      <TopBar title="Amici lettori" back right={loggedIn ? (
        <button onClick={logout} aria-label="Esci" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--cream-2)]">
          <LogOut size={18} />
        </button>
      ) : undefined} />

      {loggedIn === null && <div className="m-4 h-40 shimmer rounded-3xl" />}

      {loggedIn === false && (
        <div className="px-4 py-6 space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--forest)' }}>
              <Users size={24} style={{ color: 'var(--cream)' }} />
            </div>
            <h2 className="font-serif text-xl font-semibold">Accedi al tuo account</h2>
            <p className="text-sm text-[var(--muted)] mt-1">Salvi la libreria online, inviti gli amici e vedete a vicenda cosa state leggendo.</p>
          </div>
          <AuthForm initialMode="login" onDone={({ needsConfirm }) => needsConfirm ? alert('Controlla la tua email per confermare l\'account, poi accedi.') : load()} />
        </div>
      )}

      {loggedIn && (
      <div className="px-4 py-4 space-y-4">
        {error && <p className="text-xs font-medium p-3 rounded-xl" style={{ background: 'rgba(200,84,42,0.1)', color: '#C8542A' }}>{error}</p>}
        {/* Invite hero */}
        <div className="p-5 rounded-3xl" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} />
            <h2 className="font-serif text-lg font-semibold">Invita i tuoi amici</h2>
          </div>
          <p className="text-sm opacity-80 mb-4">Mandagli il tuo link: installano l&apos;app, si registrano e compaiono qui sotto con il libro che stanno leggendo.</p>
          <div className="flex gap-2">
            <button onClick={invite} disabled={!profile} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
              <Share2 size={16} /> Condividi l&apos;invito
            </button>
            <button onClick={copyLink} disabled={!profile} aria-label="Copia link" className="px-4 rounded-2xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50" style={{ background: 'rgba(245,241,232,0.15)', color: 'var(--cream)' }}>
              <Copy size={16} />
            </button>
          </div>
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
              <p className="text-sm text-[var(--muted)] max-w-[240px]">Nessun amico ancora. Condividi il tuo invito: appena un amico si registra, compare qui.</p>
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
                        <p className="text-xs text-[var(--muted)]">Collegato {formatRelative(f.joinedAt)} · attivo {formatRelative(f.updatedAt)}</p>

                        {/* Current book */}
                        <div className="flex items-center gap-2 mt-2 p-2 rounded-xl" style={{ background: 'var(--cream-2)' }}>
                          <BookOpen size={16} style={{ color: 'var(--forest)' }} className="flex-shrink-0" />
                          {f.currentBook ? (
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-tight truncate">{f.currentBook.title}</p>
                              <p className="text-xs text-[var(--muted)] truncate">{f.currentBook.author}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-[var(--muted)]">Non sta leggendo nulla al momento</p>
                          )}
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

                        {f.currentBook && <button onClick={() => proposeSwap(f)} className="w-full mt-2.5 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
                          <Repeat size={14} /> Proponi scambio · vediamoci
                        </button>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
