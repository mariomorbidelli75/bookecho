import Link from 'next/link'
import { LEGAL_VERSION } from '@/lib/legal'

// Impaginazione comune per Privacy e Termini: testo leggibile, su telefono e computer
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  const updated = new Date(LEGAL_VERSION).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between max-w-3xl mx-auto">
        <Link href="/app" className="font-serif text-lg font-semibold" style={{ color: 'var(--forest)' }}>Librò</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link>
          <Link href="/termini" className="underline-offset-2 hover:underline">Termini</Link>
        </nav>
      </header>
      <article className="legal max-w-3xl mx-auto px-5 py-8">
        <h1 className="font-serif text-3xl font-semibold mb-1">{title}</h1>
        <p className="text-sm text-[var(--muted)] mb-8">Ultimo aggiornamento: {updated}</p>
        {children}
      </article>
    </div>
  )
}
