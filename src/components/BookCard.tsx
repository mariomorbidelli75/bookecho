import Link from 'next/link'
import Image from 'next/image'
import { Star, BookOpen, Eye } from 'lucide-react'
import type { Book } from '@/types'
import { cn, readingPercent } from '@/lib/utils'

interface BookCardProps {
  book: Book
  compact?: boolean
}

const STATUS_BADGE = {
  read: { label: 'Letto', className: 'bg-[rgba(30,77,58,0.1)] text-[var(--forest)]' },
  reading: { label: 'In lettura', className: 'bg-[rgba(232,155,76,0.15)] text-[#B86B1A]' },
  wishlist: { label: 'Lista desideri', className: 'bg-[var(--cream-2)] text-[var(--muted)]' },
}

export function BookCard({ book, compact = false }: BookCardProps) {
  const badge = STATUS_BADGE[book.status]
  const progress = book.status === 'reading' ? readingPercent(book) : 0

  return (
    <Link
      href={`/app/book/${book.id}`}
      className={cn(
        'flex gap-3 p-3 rounded-2xl transition-all active:scale-95',
        'bg-white/60 border border-[var(--line)] hover:border-[var(--line-2)] hover:shadow-sm'
      )}
    >
      {/* Cover */}
      <div className={cn('relative flex-shrink-0 rounded-xl overflow-hidden bg-[var(--cream-2)]', compact ? 'w-12 h-16' : 'w-16 h-24')}>
        {book.cover ? (
          <Image src={book.cover} alt={book.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={compact ? 16 : 20} className="text-[var(--muted)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn('font-serif font-semibold leading-tight text-[var(--ink)] line-clamp-2', compact ? 'text-sm' : 'text-base')}>
              {book.title}
            </h3>
            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5', badge.className)}>
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5">{book.author}</p>
          {book.year && <p className="text-xs text-[var(--muted)]">{book.year} · {book.publisher}</p>}
        </div>

        <div className="flex items-center justify-between mt-1">
          {book.rating ? (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={10} className={i < (book.rating ?? 0) ? 'text-[var(--accent-amber)] fill-[var(--accent-amber)]' : 'text-[var(--cream-3)]'} />
              ))}
            </div>
          ) : <span />}
          {book.marketData && (
            <span className="text-xs font-semibold text-[var(--forest)]">
              €{book.marketData.min}–{book.marketData.max}
            </span>
          )}
        </div>

        {/* Reading progress bar */}
        {book.status === 'reading' && progress > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--cream-3)' }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'var(--accent-amber)' }} />
            </div>
            <span className="text-[10px] font-semibold text-[#B86B1A]">{progress}%</span>
          </div>
        )}
      </div>
    </Link>
  )
}
