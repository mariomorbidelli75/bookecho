'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Camera, Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/app', icon: BookOpen, label: 'Libreria' },
  { href: '/app/scan', icon: Camera, label: 'Scansiona' },
  { href: '/app/suggest', icon: Sparkles, label: 'Suggerimenti' },
  { href: '/app/profile', icon: User, label: 'Profilo' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ background: 'rgba(245,241,232,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(26,26,26,0.08)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-2 h-16">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/app' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl transition-all',
                active ? 'text-[var(--forest)]' : 'text-[var(--muted)]'
              )}
            >
              <div className={cn('p-1.5 rounded-xl transition-all', active && 'bg-[rgba(30,77,58,0.1)]')}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn('text-[10px] font-medium', active ? 'font-semibold' : '')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
