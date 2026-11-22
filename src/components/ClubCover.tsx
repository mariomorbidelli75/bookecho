import { BookOpen } from 'lucide-react'
import type { ClubBook } from '@/lib/clubs'

// Copertina del libro del club, con un segnaposto se manca
export function ClubCover({ book, size = 56 }: { book: ClubBook; size?: number }) {
  const h = Math.round(size * 1.45)
  if (book.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={book.cover} alt="" width={size} height={h} className="rounded-lg object-cover flex-shrink-0 shadow-sm" style={{ width: size, height: h }} />
  }
  return (
    <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: size, height: h, background: 'var(--forest)' }}>
      <BookOpen size={size * 0.4} style={{ color: 'var(--cream)' }} />
    </div>
  )
}
