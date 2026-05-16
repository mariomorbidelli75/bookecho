'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title?: string
  back?: boolean
  right?: React.ReactNode
  transparent?: boolean
  className?: string
}

export function TopBar({ title, back = false, right, transparent = false, className }: TopBarProps) {
  const router = useRouter()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between px-4 h-14',
        !transparent && 'border-b border-[var(--line)]',
        className
      )}
      style={transparent ? {} : { background: 'rgba(245,241,232,0.92)', backdropFilter: 'blur(20px)' }}
    >
      <div className="w-10">
        {back && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--cream-2)] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
      </div>
      {title && (
        <span className="font-serif text-base font-semibold text-[var(--ink)] truncate">{title}</span>
      )}
      <div className="w-10 flex justify-end">{right}</div>
    </header>
  )
}
