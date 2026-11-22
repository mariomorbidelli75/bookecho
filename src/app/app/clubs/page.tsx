'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Search, MessageCircle } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { AuthForm } from '@/components/AuthForm'
import { ClubCover } from '@/components/ClubCover'
import { currentUserId } from '@/lib/account'
import { listClubs, type Club } from '@/lib/clubs'
import { cn } from '@/lib/utils'

export default function ClubsPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = async () => {
    if (!(await currentUserId())) { setLoggedIn(false); return }
    setLoggedIn(true)
    try {
      setClubs(await listClubs())
      setError(null)
    } catch {
      setError('Non riesco a caricare i book club. Controlla la connessione.')
    }
  }

  useEffect(() => { load() }, [])

  const topics = [...new Set(clubs.map(c => c.topic))]
  const q = query.trim().toLowerCase()
  const visible = clubs.filter(c =>
    (!topic || c.topic === topic) &&
    (!q || `${c.name} ${c.book.title} ${c.book.author} ${c.topic}`.toLowerCase().includes(q)))
  const mine = visible.filter(c => c.am_member)
  const others = visible.filter(c => !c.am_member)

  return (
    <div>
      <TopBar title="Book club" />

      {loggedIn === null && <div className="m-4 h-40 skeleton rounded-3xl" />}

      {loggedIn === false && (
        <div className="px-4 py-6 space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--forest)' }}>
              <MessageCircle size={24} style={{ color: 'var(--cream)' }} />
            </div>
            <h2 className="font-serif text-xl font-semibold">I book club della community</h2>
            <p className="text-sm text-[var(--muted)] mt-1">Accedi per entrare nei gruppi di lettura o crearne uno tuo su Telegram.</p>
          </div>
          <AuthForm initialMode="login" onDone={({ needsConfirm }) => needsConfirm ? alert('Controlla la tua email per confermare l\'account, poi accedi.') : load()} />
        </div>
      )}

      {loggedIn && (
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-3xl p-5" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
            <h2 className="font-serif text-xl font-semibold mb-1">Leggiamo insieme</h2>
            <p className="text-sm opacity-80 mb-4">Scegli un libro e un argomento, apri il gruppo su Telegram e la community entra con un tocco.</p>
            <Link href="/app/clubs/new"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
              <Plus size={16} /> Crea un book club
            </Link>
          </div>

          {error && <p className="text-xs font-medium p-3 rounded-xl" style={{ background: 'rgba(200,84,42,0.1)', color: '#C8542A' }}>{error}</p>}

          {clubs.length > 0 && (
            <>
              <label className="relative block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cerca per libro, autore o nome del club"
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: 'white', border: '1px solid var(--line-2)' }} />
              </label>
              {topics.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                  {[null, ...topics].map(t => (
                    <button key={t ?? 'tutti'} onClick={() => setTopic(t)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all')}
                      style={topic === t
                        ? { background: 'var(--forest)', color: 'var(--cream)' }
                        : { background: 'var(--cream-2)', color: 'var(--ink)' }}>
                      {t ?? 'Tutti'}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {mine.length > 0 && <ClubList title="I miei club" clubs={mine} />}
          {others.length > 0 && <ClubList title={mine.length ? 'Altri club della community' : 'Club della community'} clubs={others} />}

          {clubs.length === 0 && !error && (
            <div className="text-center py-10">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--cream-2)' }}>
                <Users size={24} className="text-[var(--muted)]" />
              </div>
              <p className="text-sm text-[var(--muted)] max-w-[260px] mx-auto">Ancora nessun book club. Crea il primo e invita la community!</p>
            </div>
          )}
          {clubs.length > 0 && visible.length === 0 && (
            <p className="text-sm text-center text-[var(--muted)] py-6">Nessun club trovato con questa ricerca.</p>
          )}
        </div>
      )}
    </div>
  )
}

function ClubList({ title, clubs }: { title: string; clubs: Club[] }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] px-1">{title}</h3>
      <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
      {clubs.map(c => (
        <Link key={c.id} href={`/app/clubs/${c.id}`}
          className="flex gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)' }}>
          <ClubCover book={c.book} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-serif font-semibold leading-tight">{c.name}</p>
              {c.mine && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>TUO</span>}
            </div>
            <p className="text-sm text-[var(--ink-2)] truncate mt-0.5">{c.book.title} · {c.book.author}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted)]">
              <span className="px-2 py-0.5 rounded-full" style={{ background: 'var(--cream-2)' }}>{c.topic}</span>
              <span className="flex items-center gap-1"><Users size={12} /> {c.members}</span>
              <span className="truncate">di {c.creator_name}</span>
            </div>
          </div>
        </Link>
      ))}
      </div>
    </section>
  )
}
