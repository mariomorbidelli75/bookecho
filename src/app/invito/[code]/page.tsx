'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Download, Share, PlusSquare, Check, Users, Smartphone } from 'lucide-react'
import { AuthForm } from '@/components/AuthForm'
import { useInstall } from '@/lib/install'
import { inviterName, setPendingInvite, currentUserId, acceptInvite } from '@/lib/account'

// Pagina che si apre dal link d'invito di un amico:
// 1) proposta di installare l'app sul telefono  2) registrazione / accesso
// 3) collegamento automatico: l'amico compare nella lista "Amici lettori".
// Su iPhone l'ordine è invertito (prima l'account, poi "Aggiungi a Home"),
// perché l'app aggiunta alla Home non condivide i dati con Safari.

type Step = 'install' | 'account' | 'ios-install' | 'confirm-email' | 'done'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { platform, canPrompt, install } = useInstall()
  const [inviter, setInviter] = useState<string | null>(null)
  const [step, setStep] = useState<Step | null>(null)

  useEffect(() => {
    if (!code) return
    setPendingInvite(code)
    inviterName(code).then(setInviter)
  }, [code])

  // Scelta del primo passo appena si conosce il dispositivo
  useEffect(() => {
    if (step !== null) return
    const t = setTimeout(async () => {
      if (await currentUserId()) {
        await acceptInvite(code)
        setStep('done')
      } else {
        setStep(platform === 'installed' || platform === 'ios' ? 'account' : 'install')
      }
    }, 150)
    return () => clearTimeout(t)
  }, [platform, step, code])

  const who = inviter ?? 'Un amico'
  const whoIn = inviter ?? 'chi ti ha invitato'

  const afterAccount = ({ needsConfirm }: { needsConfirm: boolean }) => {
    if (needsConfirm) setStep('confirm-email')
    else setStep(platform === 'ios' ? 'ios-install' : 'done')
  }

  return (
    <div className="app-container min-h-screen flex flex-col">
      <div className="px-5 pt-10 pb-6 text-center" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
        <Image src="/icon-192.png" alt="Librò" width={64} height={64} className="mx-auto rounded-2xl mb-4" />
        <p className="text-sm opacity-80">{who} ti invita su</p>
        <h1 className="font-serif text-3xl font-semibold">Librò</h1>
        <p className="text-sm opacity-80 mt-2 max-w-[280px] mx-auto">
          Tutti i tuoi libri in un posto solo. Vedi cosa leggono gli amici e scambiatevi i libri.
        </p>
      </div>

      <div className="flex-1 px-5 py-6">
        {step === null && <div className="h-40 skeleton rounded-3xl" />}

        {step === 'install' && (
          <div className="space-y-4">
            <StepTitle n={1} title="Installa Librò sul telefono" />
            <p className="text-sm text-[var(--muted)]">Così la trovi tra le tue app, con la sua icona, senza aprire il browser.</p>
            {canPrompt ? (
              <button
                onClick={async () => { await install(); setStep('account') }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
                style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
                <Download size={18} /> Installa sul telefono
              </button>
            ) : (
              <div className="p-4 rounded-2xl text-sm flex gap-3" style={{ background: 'var(--cream-2)' }}>
                <Smartphone size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--forest)' }} />
                <span>
                  {platform === 'android'
                    ? <>Apri il menu <b>⋮</b> del browser e scegli <b>Installa app</b> (o <b>Aggiungi a schermata Home</b>).</>
                    : <>Apri questo link dal telefono per installare Librò come app.</>}
                </span>
              </div>
            )}
            <button onClick={() => setStep('account')} className="w-full text-center text-sm font-semibold py-2" style={{ color: 'var(--forest)' }}>
              {canPrompt ? 'Non ora, continua' : 'Continua'}
            </button>
          </div>
        )}

        {step === 'account' && (
          <div className="space-y-4">
            <StepTitle n={platform === 'ios' || platform === 'installed' ? 1 : 2} title="Crea il tuo account" />
            <p className="text-sm text-[var(--muted)]">
              Ti serve per ritrovare i tuoi libri e per comparire tra gli amici lettori di {whoIn}.
            </p>
            <AuthForm invite={code} onDone={afterAccount} />
          </div>
        )}

        {step === 'ios-install' && (
          <div className="space-y-4">
            <StepTitle n={2} title="Aggiungi Librò alla Home" />
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                <Share size={20} style={{ color: '#0B5FA5' }} /> <span>Tocca <b>Condividi</b> in basso nella barra di Safari</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                <PlusSquare size={20} /> <span>Scegli <b>Aggiungi alla schermata Home</b></span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
                <Check size={20} style={{ color: 'var(--forest)' }} /> <span>Apri Librò dalla Home e <b>accedi</b> con email e password appena create</span>
              </li>
            </ol>
            <button onClick={() => setStep('done')} className="w-full text-center text-sm font-semibold py-2" style={{ color: 'var(--forest)' }}>
              Fatto, continua
            </button>
          </div>
        )}

        {step === 'confirm-email' && (
          <div className="text-center space-y-3 py-6">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'var(--cream-2)' }}>
              <Check size={26} style={{ color: 'var(--forest)' }} />
            </div>
            <h2 className="font-serif text-xl font-semibold">Controlla la tua email</h2>
            <p className="text-sm text-[var(--muted)]">Ti abbiamo mandato un link per confermare l&apos;account. Sei già collegato a {whoIn}.</p>
            {platform === 'ios' && (
              <button onClick={() => setStep('ios-install')} className="text-sm font-semibold" style={{ color: 'var(--forest)' }}>
                Intanto aggiungi Librò alla Home
              </button>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4 py-6">
            <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'var(--forest)' }}>
              <Users size={26} style={{ color: 'var(--cream)' }} />
            </div>
            <h2 className="font-serif text-xl font-semibold">Siete collegati!</h2>
            <p className="text-sm text-[var(--muted)]">Ora tu e {whoIn} vi vedete tra gli amici lettori.</p>
            <button onClick={() => router.push('/app/friends')}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              Apri Librò
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>{n}</span>
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
    </div>
  )
}
