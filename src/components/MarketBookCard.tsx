import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, MapPin, Tag } from 'lucide-react'
import type { Book } from '@/types'
import { formatDate, formatPrice } from '@/lib/utils'

// Card di un libro del mercatino: prezzo di inserzione, posizione fisica e,
// se venduto, incasso + canale di vendita.
export function MarketBookCard({ book }: { book: Book }) {
  const sold = book.status === 'sold'

  return (
    <Link
      href={`/app/mercatino/${book.id}`}
      className="flex gap-3 p-3 rounded-2xl transition-all active:scale-95 bg-white/60 border border-[var(--line)] hover:border-[var(--line-2)] hover:shadow-sm"
    >
      <div className="relative flex-shrink-0 w-16 h-24 rounded-xl overflow-hidden bg-[var(--cream-2)]">
        {book.cover ? (
          <Image src={book.cover} alt={book.title} fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={20} className="text-[var(--muted)]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-base font-semibold leading-tight text-[var(--ink)] line-clamp-2">
              {book.title}
            </h3>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
              style={sold
                ? { background: 'var(--forest)', color: 'var(--cream)' }
                : { background: 'rgba(232,155,76,0.18)', color: '#B86B1A' }}
            >
              {sold ? 'Venduto' : 'In vendita'}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{book.author}</p>
          {(book.publisher || book.edition) && (
            <p className="text-xs text-[var(--muted)] truncate">
              {[book.publisher, book.edition, book.year].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="mt-1 space-y-0.5">
          {!sold && book.location && (
            <p className="flex items-center gap-1 text-xs text-[var(--muted)] truncate">
              <MapPin size={11} className="flex-shrink-0" /> {book.location}
            </p>
          )}
          {sold ? (
            <p className="text-xs font-semibold text-[var(--forest)]">
              {book.soldPrice != null ? formatPrice(book.soldPrice) : '—'}
              {book.soldChannel ? ` · ${book.soldChannel}` : ''}
              {book.soldAt ? ` · ${formatDate(book.soldAt)}` : ''}
            </p>
          ) : (
            <p className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#B86B1A' }}>
              <Tag size={11} />
              {book.listingPrice != null ? formatPrice(book.listingPrice) : 'Prezzo da definire'}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
