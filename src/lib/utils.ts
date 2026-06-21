import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(value)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

// Reading progress as a 0–100 percentage.
// When pages are known, derives from currentPage; otherwise currentPage holds the percent directly.
export function readingPercent(book: {
  pages?: number | null
  currentPage?: number | null
  status: string
}): number {
  const cur = book.currentPage ?? (book.status === 'read' ? (book.pages ?? 100) : 0)
  if (book.pages && book.pages > 0) {
    return Math.min(100, Math.max(0, Math.round((cur / book.pages) * 100)))
  }
  return Math.min(100, Math.max(0, Math.round(cur)))
}

// "2 ore fa", "ieri", "3 giorni fa" — tempo trascorso in italiano.
export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'adesso'
  if (min < 60) return `${min} min fa`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ieri'
  if (days < 30) return `${days} giorni fa`
  return formatDate(d)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}
