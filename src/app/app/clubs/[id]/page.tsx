'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Send, Users, Share2, Flag, LogOut, Trash2, Pencil, Check, Loader2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ClubCover } from '@/components/ClubCover'
import { currentUserId } from '@/lib/account'
import { getClub, joinClub, leaveClub, reportClub, deleteClub, updateClub, normalizeTelegramLink, type Club } from '@/lib/clubs'
import { formatRelative } from '@/lib/utils'

export default function ClubPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [club, setClub] = useState<Club | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [editing, setEditing] = useState(false)
  const [eLink, setELink] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    if (!(await currentUserId())) { router.replace('/app/clubs'); return }
    try {
      const c = await getClub(id)
      setClub(c)
      setState(c ? 'ok' : 'missing')
    } catch {
      setState('missing')
    }
  }

  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'loading') return <div><TopBar title="Book club" back /><div className="m-4 h-60 skeleton rounded-3xl" /></div>
  if (state === 'missing' || !club) {
    return (
      <div>
        <TopBar title="Book club" back />
        <p className="text-sm text-center text-[var(--muted)] p-8">Questo book club non esiste più.</p>
      </div>
    )
  }

  // Il link si apre subito (i browser bloccano le finestre aperte dopo un'attesa);
  // l'iscrizione nell'app si registra in parallelo.
  const enter = () => {
    if (!club.am_member) {
      joinClub(club.id).then(() => setClub(c => c ? { ...c, am_member: true, members: c.members + 1 } : c)).catch(() => {})
    }
  }

  const leave = async () => {
    if (!confirm('Esci dal club nell\'app? Ricordati di uscire anche dal gruppo Telegram.')) return
    await leaveClub(club.id)
    setClub({ ...club, am_member: false, members: Math.max(0, club.members - 1) })
  }

  const share = async () => {
    const url = `${window.location.origin}/app/clubs/${club.id}`
    const text = `📚 Unisciti al book club "${club.name}" su Librò: leggiamo "${club.book.title}" di ${club.book.author}.\n${url}`
    try {
      if (navigator.share) await navigator.share({ title: club.name, text, url })
      else { await navigator.clipboard.writeText(text); setMsg('Invito copiato negli appunti!') }
    } catch {}
  }

  const report = async () => {
    const reason = prompt('Perché segnali questo club? (es. link sbagliato, contenuti offensivi, spam)')
    if (reason === null) return
    try { await reportClub(club.id, reason); setMsg('Grazie, segnalazione inviata.') } catch { setMsg('Segnalazione non riuscita, riprova.') }
  }

  const remove = async () => {
    if (!confirm('Eliminare il book club dall\'app? Il gruppo Telegram resta, va chiuso da Telegram.')) return
    await deleteClub(club.id)
    router.replace('/app/clubs')
  }

  const startEdit = () => { setELink(club.telegram_url); setEDesc(club.description ?? ''); setEditing(true); setMsg(null) }
  const saveEdit = async () => {
    if (!normalizeTelegramLink(eLink)) { setMsg('Il link deve essere un invito Telegram (t.me/…)'); return }
    setBusy(true)
    try {
      await updateClub(club.id, { telegramUrl: eLink, description: eDesc })
      await load()
      setEditing(false)
      setMsg('Modifiche salvate.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Salvataggio non riuscito.')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <TopBar title="Book club" back right={
        <button onClick={share} aria-label="Condividi" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--cream-2)]">
          <Share2 size={18} />
        </button>
      } />
      <div className="px-4 py-4 space-y-4">
        <div className="rounded-3xl p-5" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
          <div className="flex gap-4">
            <ClubCover book={club.book} size={72} />
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,241,232,0.15)' }}>{club.topic}</span>
              <h1 className="font-serif text-xl font-semibold leading-tight mt-2">{club.name}</h1>
              <p className="text-sm opacity-80 mt-1">{club.book.title}</p>
              <p className="text-xs opacity-60">{club.book.author}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 text-xs opacity-80">
            <span className="flex items-center gap-1"><Users size={13} /> {club.members} {club.members === 1 ? 'lettore' : 'lettori'}</span>
            <span>·</span>
            <span>creato da {club.mine ? 'te' : club.creator_name} {formatRelative(club.created_at)}</span>
          </div>
        </div>

        {club.description && !editing && (
          <p className="text-sm leading-relaxed p-4 rounded-2xl whitespace-pre-line" style={{ background: 'var(--cream-2)' }}>{club.description}</p>
        )}

        {!editing && (
          <a href={club.telegram_url} target="_blank" rel="noopener noreferrer" onClick={enter}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
            style={{ background: '#229ED9', color: 'white' }}>
            <Send size={17} /> {club.am_member ? 'Apri il gruppo su Telegram' : 'Entra nel gruppo su Telegram'}
          </a>
        )}
        {!editing && club.am_member && !club.mine && (
          <p className="text-xs text-center text-[var(--muted)] flex items-center justify-center gap-1"><Check size={12} /> Fai parte di questo club</p>
        )}

        {editing && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--muted)]">Link d&apos;invito Telegram</p>
            <input value={eLink} onChange={e => setELink(e.target.value)} className="w-full px-3 py-3 rounded-xl text-sm outline-none" style={{ background: 'white', border: '1px solid var(--line-2)' }} />
            <p className="text-xs font-semibold text-[var(--muted)]">Descrizione</p>
            <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} rows={4} maxLength={600} className="w-full px-3 py-3 rounded-xl text-sm outline-none" style={{ background: 'white', border: '1px solid var(--line-2)' }} />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'var(--cream-2)' }}>Annulla</button>
              <button onClick={saveEdit} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
                {busy && <Loader2 size={15} className="animate-spin" />} Salva
              </button>
            </div>
          </div>
        )}

        {msg && <p className="text-xs font-medium text-center" style={{ color: 'var(--forest)' }}>{msg}</p>}

        <div className="pt-2 space-y-1">
          {club.mine ? (
            <>
              {!editing && <ActionRow icon={<Pencil size={16} />} label="Modifica link o descrizione" onClick={startEdit} />}
              <ActionRow icon={<Trash2 size={16} />} label="Elimina il book club" onClick={remove} danger />
            </>
          ) : (
            <>
              {club.am_member && <ActionRow icon={<LogOut size={16} />} label="Esci dal club" onClick={leave} />}
              <ActionRow icon={<Flag size={16} />} label="Segnala il club" onClick={report} danger />
            </>
          )}
        </div>

        <p className="text-[11px] text-[var(--muted)] leading-relaxed px-1">
          Le conversazioni si svolgono su Telegram, fuori da Librò: lì valgono le regole di Telegram. Non condividere dati personali e, se vi incontrate per scambiarvi libri, scegliete luoghi pubblici.
        </p>
      </div>
    </div>
  )
}

function ActionRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium hover:bg-[var(--cream-2)] transition-colors"
      style={{ color: danger ? '#C8542A' : 'var(--ink)' }}>
      {icon} {label}
    </button>
  )
}
