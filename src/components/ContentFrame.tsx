'use client'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// Larghezza del contenuto: telefono = colonna da app; tablet/computer = elenchi
// larghi (più libri per riga), schede e moduli più stretti per leggerli bene.
const WIDE = ['/app', '/app/mercatino', '/app/clubs', '/app/suggest', '/app/mercatino/stats']

export function ContentFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const wide = WIDE.includes(pathname)
  return <div className={cn('app-content', wide ? 'app-content--wide' : 'app-content--narrow')}>{children}</div>
}
