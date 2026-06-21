'use client'
import { useState } from 'react'
import { Gift, Check, Heart, Share2, CreditCard, Sparkles } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { cn } from '@/lib/utils'

type Step = 'plan' | 'recipient' | 'pay' | 'done'

const PLANS = [
  { id: 'year', label: 'Librò Plus — 1 anno', price: 29.99, period: '/anno', best: true, perks: ['Trailer audio illimitati', 'Valore di mercato live', 'Annunci AI per i marketplace'] },
  { id: 'half', label: 'Librò Plus — 6 mesi', price: 17.99, period: '/6 mesi', best: false, perks: ['Trailer audio illimitati', 'Valore di mercato live'] },
]

function genGiftCode(): string {
  return `REGALO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export default function GiftPage() {
  const [step, setStep] = useState<Step>('plan')
  const [planId, setPlanId] = useState('year')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [paying, setPaying] = useState(false)
  const [code, setCode] = useState('')

  const plan = PLANS.find(p => p.id === planId)!

  const pay = () => {
    setPaying(true)
    // Pagamento simulato (demo). In produzione qui andrebbe lo checkout reale.
    setTimeout(() => {
      setCode(genGiftCode())
      setPaying(false)
      setStep('done')
    }, 1400)
  }

  const shareGift = async () => {
    const text = `🎁 ${name || 'Ti'} ho regalato un anno di Librò — tutti i libri in un posto solo!\nRiscatta il tuo abbonamento con il codice ${code}\nhttps://bookecho-iota.vercel.app/app`
    try {
      if (navigator.share) await navigator.share({ title: 'Un regalo da Librò', text })
      else { await navigator.clipboard.writeText(text); alert('Messaggio copiato negli appunti!') }
    } catch {}
  }

  return (
    <div className="pb-8">
      <TopBar title="Regala a un amico" back />

      {/* Hero */}
      <div className="mx-4 mt-3 p-5 rounded-3xl text-center" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <Gift size={28} />
        </div>
        <h2 className="font-serif text-xl font-semibold">Regala un anno di lettura</h2>
        <p className="text-sm opacity-80 mt-1">Paga tu il primo anno di abbonamento a un amico. Glielo recapitiamo con un messaggio tuo.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 my-5">
        {(['plan', 'recipient', 'pay'] as Step[]).map((s, i) => {
          const order = ['plan', 'recipient', 'pay', 'done']
          const done = order.indexOf(step) > i
          const active = step === s
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                active ? 'text-[var(--cream)]' : done ? 'text-[var(--cream)]' : 'text-[var(--muted)]')}
                style={{ background: active || done ? 'var(--forest)' : 'var(--cream-2)' }}>
                {done ? <Check size={14} /> : i + 1}
              </div>
              {i < 2 && <div className="w-6 h-0.5" style={{ background: 'var(--line)' }} />}
            </div>
          )
        })}
      </div>

      <div className="px-4">
        {/* STEP 1 — plan */}
        {step === 'plan' && (
          <div className="space-y-3">
            {PLANS.map(p => (
              <button
                key={p.id}
                onClick={() => setPlanId(p.id)}
                className="w-full text-left p-4 rounded-2xl border-2 transition-all"
                style={{ borderColor: planId === p.id ? 'var(--forest)' : 'var(--line)', background: planId === p.id ? 'var(--cream-2)' : 'white' }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-serif font-semibold flex items-center gap-2">
                    {p.label}
                    {p.best && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>CONSIGLIATO</span>}
                  </span>
                </div>
                <p className="font-serif text-2xl font-bold" style={{ color: 'var(--forest)' }}>€{p.price}<span className="text-sm font-normal text-[var(--muted)]">{p.period}</span></p>
                <ul className="mt-2 space-y-1">
                  {p.perks.map(perk => (
                    <li key={perk} className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
                      <Sparkles size={12} style={{ color: 'var(--accent-amber)' }} /> {perk}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
            <button onClick={() => setStep('recipient')} className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              Continua
            </button>
          </div>
        )}

        {/* STEP 2 — recipient */}
        {step === 'recipient' && (
          <div className="space-y-3">
            <Field label="Nome dell'amico" value={name} onChange={setName} placeholder="Es. Giulia" />
            <Field label="Email (per recapitare il regalo)" value={email} onChange={setEmail} placeholder="amico@email.it" type="email" />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">Messaggio personale</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="Buona lettura! 📚"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('plan')} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold border" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>Indietro</button>
              <button onClick={() => setStep('pay')} disabled={!name.trim() || !email.trim()} className="flex-1 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-40" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>Continua</button>
            </div>
          </div>
        )}

        {/* STEP 3 — pay */}
        {step === 'pay' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--cream-2)' }}>
              <Row label="Regalo" value={plan.label} />
              <Row label="Destinatario" value={name} />
              <Row label="Email" value={email} />
              <div className="h-px my-1" style={{ background: 'var(--line)' }} />
              <Row label="Totale oggi" value={`€${plan.price}`} bold />
            </div>
            <button onClick={pay} disabled={paying} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60" style={{ background: 'var(--forest)', color: 'var(--cream)' }}>
              <CreditCard size={16} /> {paying ? 'Elaborazione…' : `Paga €${plan.price} e regala`}
            </button>
            <p className="text-[11px] text-center text-[var(--muted)]">Pagamento dimostrativo — nessun addebito reale in questa versione.</p>
            <button onClick={() => setStep('recipient')} className="w-full text-sm font-semibold text-[var(--muted)]">Indietro</button>
          </div>
        )}

        {/* STEP 4 — done */}
        {step === 'done' && (
          <div className="text-center space-y-4 animate-fade-up">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(30,77,58,0.1)' }}>
              <Heart size={30} style={{ color: 'var(--forest)' }} className="fill-[var(--forest)]" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-semibold">Regalo inviato a {name}! 🎁</h3>
              <p className="text-sm text-[var(--muted)] mt-1">Un anno di Librò Plus è pronto da riscattare.</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'var(--cream-2)' }}>
              <p className="text-xs text-[var(--muted)] mb-1">Codice regalo</p>
              <p className="font-mono text-lg font-bold tracking-wider" style={{ color: 'var(--forest)' }}>{code}</p>
            </div>
            <button onClick={shareGift} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: 'var(--accent-amber)', color: 'var(--ink)' }}>
              <Share2 size={16} /> Invia il regalo a {name}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
        style={{ background: 'var(--cream-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
      />
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <span className={cn('text-[var(--ink)] truncate ml-3', bold ? 'font-bold' : 'font-medium')}>{value}</span>
    </div>
  )
}
