'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS } from '@/components/BottomNav'
import { cn } from '@/lib/utils'

// Menu laterale per tablet e computer (da 768px in su): al posto della barra in basso
export function SideNav() {
  const pathname = usePathname()
  return (
    <aside
      className="hidden md:flex fixed left-0 top-0 h-dvh w-60 flex-col z-50 px-4 py-6"
      style={{ background: 'var(--forest)', color: 'var(--cream)' }}
    >
      <Link href="/app" className="flex items-center gap-3 px-2 mb-8">
        <Image src="/icon-192.png" alt="" width={40} height={40} className="rounded-xl" />
        <span className="font-serif text-2xl font-semibold">Librò</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/app' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                active ? 'font-semibold' : 'opacity-75 hover:opacity-100 hover:bg-[rgba(245,241,232,0.08)]')}
              style={active ? { background: 'rgba(245,241,232,0.14)' } : undefined}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>
      <p className="mt-auto px-2 text-xs opacity-50">Tutti i libri in un posto solo</p>
    </aside>
  )
}
