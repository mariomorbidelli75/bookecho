'use client'
import { useState } from 'react'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { signUp, signIn, errorText } from '@/lib/account'
import { isCloudReady } from '@/lib/supabase'

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
    if (password.length < 6) return setError('La password deve avere almeno 6 caratteri.')
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
        <input className={field} style={fieldStyle} type="password" required placeholder="Password (min. 6 caratteri)"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password} onChange={e => setPassword(e.target.value)} />
      </label>

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
