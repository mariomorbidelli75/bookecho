'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { BookOpen, ShoppingBag, ExternalLink, ChevronDown } from 'lucide-react'
import type { AuthorBook } from '@/lib/books'
import { buyLinks } from '@/lib/marketplaces'

interface AuthorBooksProps {
  author: string
  excludeTitle: string
}

const KIND_LABEL: Record<string, string> = {
  nuovo: 'Nuovo',
  usato: 'Usato',
  collezione: 'Collezione',
}

export function AuthorBooks({ author, excludeTitle }: AuthorBooksProps) {
  const [books, setBooks] = useState<AuthorBook[]>([])
  const [loading, setLoading] = useState(true)
  const [openTitle, setOpenTitle] = useState<string | null>(null)

  useEffect(() => {
    if (!author || author === 'Autore sconosciuto') {
      setLoading(false)
      return
    }
    let active = true
    const params = new URLSearchParams({ name: author, exclude: excludeTitle })
    fetch(`/api/author?${params}`)
      .then(r => r.json())
      .then((data: AuthorBook[]) => { if (active) setBooks(data) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [author, excludeTitle])

  if (!loading && books.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
        Altri libri di {author.split(',')[0]}
      </p>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {books.map(b => {
            const open = openTitle === b.title
            return (
              <div key={b.title} className="rounded-2xl overflow-hidden border border-[var(--line)] bg-white/60">
                <button
                  onClick={() => setOpenTitle(open ? null : b.title)}
                  className="w-full flex gap-3 p-3 text-left transition-colors hover:bg-[var(--cream-2)]"
                >
                  <div className="relative flex-shrink-0 w-12 h-16 rounded-xl overflow-hidden bg-[var(--cream-2)]">
                    {b.cover ? (
                      <Image src={b.cover} alt={b.title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-[var(--muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-serif font-semibold text-sm leading-tight text-[var(--ink)] line-clamp-2">{b.title}</h4>
                    {b.year && <p className="text-xs text-[var(--muted)] mt-0.5">{b.year}</p>}
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--forest)] mt-1">
                      <ShoppingBag size={12} /> Dove comprarlo
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    className="text-[var(--muted)] flex-shrink-0 self-center transition-transform"
                    style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                  />
                </button>

                {open && (
                  <div className="px-3 pb-3 pt-1 flex flex-wrap gap-1.5">
                    {buyLinks(b.title, b.author).map(link => (
                      <a
                        key={link.platform}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-white transition-transform active:scale-95"
                        style={{ background: link.color }}
                        title={`${link.platform} · ${KIND_LABEL[link.kind]}`}
                      >
                        {link.platform}
                        <ExternalLink size={11} className="opacity-80" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
