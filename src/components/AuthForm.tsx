'use client'
import { useState } from 'react'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { signUp, signIn, errorText } from '@/lib/account'
import { isCloudReady } from '@/lib/supabase'
import { MIN_AGE } from '@/lib/legal'

interface AuthFormProps {
  invite?: string
  /** Modalità iniziale: chi arriva da un invito parte dalla registrazione */
  initialMode?: 'signup' | 'login'
  onDone: (result: { needsConfirm: boolean }) => void
}

export function AuthForm({ invite, initialMode = 'signup', onDone }: AuthFormProps) {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)

  if (!isCloudReady) {
    return (
      <div className="p-4 rounded-2xl text-sm" style={{ background: 'var(--cream-2)' }}>
        La registrazione non è ancora attiva su questa versione dell&apos;app.
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (mode === 'signup' && !name.trim()) return setError('Scrivi il tuo nome.')
    if (mode === 'signup' && password.length < 8) return setError('Scegli una password di almeno 8 caratteri.')
    if (mode === 'login' && password.length < 6) return setError('Password troppo corta.')
    if (mode === 'signup' && !consent) return setError('Per registrarti devi accettare termini e privacy.')
    setBusy(true)
    try {
      if (mode === 'signup') onDone(await signUp(name, email, password, invite))
      else { await signIn(email, password, invite); onDone({ needsConfirm: false }) }
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none'
  const fieldStyle = { background: 'white', border: '1px solid var(--line-2)', color: 'var(--ink)' }

  return (
    <form onSubmit={submit} className="space-y-3">
      {mode === 'signup' && (
        <label className="relative block">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input className={field} style={fieldStyle} placeholder="Il tuo nome" autoComplete="name"
            value={name} onChange={e => setName(e.target.value)} />
        </label>
      )}
      <label className="relative block">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input className={field} style={fieldStyle} type="email" required placeholder="Email" autoComplete="email"
          inputMode="email" value={email} onChange={e => setEmail(e.target.value)} />
      </label>
      <label className="relative block">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input className={field} style={fieldStyle} type="password" required placeholder={mode === 'signup' ? 'Password (almeno 8 caratteri)' : 'Password'}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={e => setPassword(e.target.value)} />
      </label>

      {mode === 'signup' && (
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--ink-2)] cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[var(--forest)]" />
          <span>
            Ho almeno {MIN_AGE} anni e accetto i{' '}
            <a href="/termini" target="_blank" className="underline font-semibold">Termini d&apos;uso</a> e
            l&apos;<a href="/privacy" target="_blank" className="underline font-semibold">Informativa privacy</a>.
          </span>
        </label>
      )}

      {error && <p className="text-xs font-medium" style={{ color: '#C8542A' }}>{error}</p>}

      <button type="submit" disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
        {busy && <Loader2 size={16} className="animate-spin" />}
        {mode === 'signup' ? 'Crea il mio account' : 'Accedi'}
      </button>

      <button type="button" onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(null) }}
        className="w-full text-center text-xs font-semibold py-1" style={{ color: 'var(--forest)' }}>
        {mode === 'signup' ? 'Ho già un account · Accedi' : 'Non hai un account? Registrati'}
      </button>
    </form>
  )
}
