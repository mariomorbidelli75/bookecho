'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Send, ExternalLink, BookOpen, PenLine } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ClubCover } from '@/components/ClubCover'
import { getLibraryBooks } from '@/lib/storage'
import { createClub, normalizeTelegramLink, TOPICS, type ClubBook } from '@/lib/clubs'
import { currentUserId } from '@/lib/account'
import type { Book } from '@/types'

type Step = 1 | 2 | 3

export default function NewClubPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [library, setLibrary] = useState<Book[]>([])
  const [manual, setManual] = useState(false)
  const [book, setBook] = useState<ClubBook | null>(null)
  const [mTitle, setMTitle] = useState('')
  const [mAuthor, setMAuthor] = useState('')
  const [filter, setFilter] = useState('')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    currentUserId().then(id => { if (!id) router.replace('/app/clubs') })
    const books = getLibraryBooks()
    setLibrary(books)
    if (books.length === 0) setManual(true)
  }, [router])

  const pick = (b: Book) => {
    setBook({
      title: b.title,
      author: b.author ?? '',
      cover: b.cover?.startsWith('http') ? b.cover : undefined,
      isbn: b.isbn ?? undefined,
    })
    if (!name) setName(`Leggiamo "${b.title}"`.slice(0, 80))
    setStep(2)
  }

  const pickManual = () => {
    if (mTitle.trim().length < 2) return setError('Scrivi il titolo del libro.')
    setError(null)
    setBook({ title: mTitle.trim(), author: mAuthor.trim() })
    if (!name) setName(`Leggiamo "${mTitle.trim()}"`.slice(0, 80))
    setStep(2)
  }

  const toStep3 = () => {
    if (name.trim().length < 3) return setError('Dai un nome al club (almeno 3 lettere).')
    if (!topic) return setError('Scegli un argomento.')
    setError(null)
    setStep(3)
  }

  const validLink = normalizeTelegramLink(link)

  const create = async () => {
    if (!book || !validLink) return
    setBusy(true)
    setError(null)
    try {
      const id = await createClub({ name, topic, description, book, telegramUrl: validLink })
      router.replace(`/app/clubs/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Creazione non riuscita, riprova.')
      setBusy(false)
    }
  }

  const q = filter.trim().toLowerCase()
  const shown = library.filter(b => !q || `${b.title} ${b.author}`.toLowerCase().includes(q)).slice(0, 40)
  const field = 'w-full px-3 py-3 rounded-xl text-sm outline-none'
  const fieldStyle = { background: 'white', border: '1px solid var(--line-2)', color: 'var(--ink)' }

  return (
    <div>
      <TopBar title="Nuovo book club" back />
      <div className="px-4 py-4 space-y-5">
        <Steps step={step} />

        {/* ── 1. Libro ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold">Quale libro leggerete?</h2>
            {!manual ? (
              <>
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Cerca nella tua libreria" className={field} style={fieldStyle} />
                <div className="space-y-2 max-h-[52vh] overflow-y-auto">
                  {shown.map(b => (
                    <button key={b.id} onClick={() => pick(b)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid var(--line)' }}>
                      <ClubCover book={{ title: b.title, author: b.author ?? '', cover: b.cover ?? undefined }} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{b.title}</p>
                        <p className="text-xs text-[var(--muted)] truncate">{b.author}</p>
                      </div>
                    </button>
                  ))}
                  {shown.length === 0 && <p className="text-sm text-[var(--muted)] text-center py-4">Nessun libro trovato.</p>}
                </div>
                <button onClick={() => setManual(true)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-2" style={{ color: 'var(--forest)' }}>
                  <PenLine size={15} /> Non è nella mia libreria, lo scrivo io
                </button>
              </>
            ) : (
              <>
                <input value={mTitle} onChange={e => setMTitle(e.target.value)} placeholder="Titolo del libro" className={field} style={fieldStyle} />
                <input value={mAuthor} onChange={e => setMAuthor(e.target.value)} placeholder="Autore" className={field} style={fieldStyle} />
                <PrimaryButton onClick={pickManual}>Avanti</PrimaryButton>
                {library.length > 0 && (
                  <button onClick={() => setManual(false)} className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-1" style={{ color: 'var(--forest)' }}>
                    <BookOpen size={15} /> Scegli dalla mia libreria
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── 2. Nome e argomento ──────────────────────────────────── */}
        {step === 2 && book && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <ClubCover book={book} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{book.title}</p>
                <p className="text-xs text-[var(--muted)] truncate">{book.author}</p>
              </div>
              <button onClick={() => setStep(1)} className="text-xs font-semibold" style={{ color: 'var(--forest)' }}>Cambia</button>
            </div>
            <h2 className="font-serif text-lg font-semibold">Il tuo club</h2>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Nome del club" className={field} style={fieldStyle} />
            <div>
              <p className="text-xs font-semibold text-[var(--muted)] mb-2">Argomento</p>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={topic === t ? { background: 'var(--forest)', color: 'var(--cream)' } : { background: 'var(--cream-2)', color: 'var(--ink)' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={600} rows={3}
              placeholder="Due righe per invitare: ritmo di lettura (es. 3 capitoli a settimana), quando vi sentite…" className={field} style={fieldStyle} />
            <PrimaryButton onClick={toStep3}>Avanti</PrimaryButton>
          </div>
        )}

        {/* ── 3. Gruppo Telegram ───────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold">Crea il gruppo su Telegram</h2>
            <p className="text-sm text-[var(--muted)]">La discussione del club si svolge su Telegram. Crealo così:</p>
            <ol className="space-y-2 text-sm">
              {[
                <>Apri Telegram e tocca <b>✏️ Nuovo messaggio → Nuovo gruppo</b></>,
                <>Chiamalo <b>{name}</b> (aggiungere persone non serve, tocca Avanti)</>,
                <>Apri il gruppo, tocca il <b>nome in alto → Modifica</b> (o ⋮) → <b>Link d&apos;invito</b></>,
                <>Tocca <b>Copia link</b> e torna qui</>,
              ].map((t, i) => (
                <li key={i} className="flex gap-3 p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
            <a href="tg://" className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold"
              style={{ background: '#229ED9', color: 'white' }}>
              <Send size={16} /> Apri Telegram
            </a>
            <p className="text-xs text-[var(--muted)] text-center">
              Non hai Telegram? <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Scaricalo qui <ExternalLink size={11} /></a>
            </p>

            <div className="pt-2">
              <p className="text-xs font-semibold text-[var(--muted)] mb-2">Incolla qui il link d&apos;invito del gruppo</p>
              <input value={link} onChange={e => setLink(e.target.value)} inputMode="url" autoCapitalize="none" autoCorrect="off"
                placeholder="https://t.me/+AbC123xyz" className={field} style={fieldStyle} />
              {link && (
                <p className="text-xs font-medium mt-1.5" style={{ color: validLink ? 'var(--forest)' : '#C8542A' }}>
                  {validLink ? <span className="inline-flex items-center gap-1"><Check size={12} /> Link Telegram valido</span> : 'Questo non sembra un link d\'invito Telegram (deve iniziare con t.me/)'}
                </p>
              )}
            </div>

            <PrimaryButton onClick={create} disabled={!validLink || busy}>
              {busy && <Loader2 size={16} className="animate-spin" />} Pubblica il book club
            </PrimaryButton>
            <p className="text-xs text-[var(--muted)] text-center">Chiunque nella community potrà vedere il club ed entrare nel gruppo con questo link.</p>
          </div>
        )}

        {error && <p className="text-xs font-medium" style={{ color: '#C8542A' }}>{error}</p>}
      </div>
    </div>
  )
}

function Steps({ step }: { step: Step }) {
  const labels = ['Libro', 'Club', 'Telegram']
  return (
    <div className="flex items-center gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex-1">
          <div className="h-1.5 rounded-full" style={{ background: i < step ? 'var(--forest)' : 'var(--line-2)' }} />
          <p className="text-[10px] font-semibold mt-1" style={{ color: i < step ? 'var(--forest)' : 'var(--muted)' }}>{l}</p>
        </div>
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
      style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
      {children}
    </button>
  )
}
