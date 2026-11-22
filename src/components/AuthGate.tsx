'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/AuthForm'

// Ingresso dell'app: senza accesso si vede solo la schermata di benvenuto
// con registrazione / accesso. Così su ogni telefono è chiaro chi sta usando Librò.
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'in' | 'out'>(supabase ? 'loading' : 'in')
  const [confirmSent, setConfirmSent] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setState(data.session ? 'in' : 'out'))
    const { data } = supabase.auth.onAuthStateChange((_ev, session) => setState(session ? 'in' : 'out'))
    return () => data.subscription.unsubscribe()
  }, [])

  if (state === 'in') return <>{children}</>
  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 skeleton rounded-2xl" /></div>
  }

  return (
    <div className="min-h-screen flex flex-col md:max-w-none">
      <div className="px-6 pt-14 pb-8 text-center" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
        <Image src="/icon-192.png" alt="Librò" width={72} height={72} className="mx-auto rounded-2xl mb-4" />
        <h1 className="font-serif text-3xl font-semibold">Librò</h1>
        <p className="text-sm opacity-80 mt-2 max-w-[280px] mx-auto">
          Tutti i tuoi libri in un posto solo. Scopri cosa leggono gli amici, entra nei book club, valuta e scambia i tuoi libri.
        </p>
      </div>
      <div className="flex-1 px-5 py-6 w-full md:max-w-md md:mx-auto md:py-10">
        {confirmSent ? (
          <div className="text-center space-y-2 py-6">
            <h2 className="font-serif text-xl font-semibold">Controlla la tua email</h2>
            <p className="text-sm text-[var(--muted)]">Ti abbiamo mandato un link per confermare l&apos;account. Aprilo e poi accedi qui.</p>
            <button onClick={() => setConfirmSent(false)} className="text-sm font-semibold pt-2" style={{ color: 'var(--forest)' }}>Torna all&apos;accesso</button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl font-semibold mb-1">Benvenuto</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Accedi con il tuo account o creane uno nuovo: ci vuole un minuto.</p>
            <AuthForm initialMode="login" onDone={({ needsConfirm }) => { if (needsConfirm) setConfirmSent(true) }} />
            <p className="text-[11px] text-center text-[var(--muted)] mt-6">
              <a href="/privacy" className="underline">Privacy</a> · <a href="/termini" className="underline">Termini d&apos;uso</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
