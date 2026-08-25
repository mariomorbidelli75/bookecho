export type BookStatus = 'read' | 'reading' | 'to-read' | 'wishlist' | 'for-sale' | 'sold'

// Dove "vive" il libro: nella libreria personale o nel mercatino (magazzino vendita).
// I libri del mercatino non compaiono in libreria e viceversa.
export type Collection = 'library' | 'market'

export interface Book {
  id: string
  title: string
  author: string
  isbn?: string | null
  publisher?: string | null
  year?: number | null
  cover?: string | null
  summary?: string | null
  // Da dove viene la trama: una sintesi scritta dall'AI non va spacciata per
  // testo d'editore, quindi la scheda la dichiara.
  summarySource?: 'google' | 'openlibrary' | 'wikipedia' | 'ai' | null
  emotions?: string[] | null
  rating?: number | null
  status: BookStatus
  purchasePrice?: number | null
  notes?: string | null
  language?: string | null
  pages?: number | null
  genre?: string | null
  audioUrl?: string | null
  marketData?: MarketData | null
  readingStartedAt?: string | null
  readingFinishedAt?: string | null
  currentPage?: number | null
  // Dove il libro è fisicamente archiviato (es. "Libreria salotto, 3ª mensola")
  location?: string | null
  // Foto della libreria/scaffale come promemoria visivo (JPEG base64 compresso)
  locationPhoto?: string | null
  // Scarico vendita: valore e data di vendita (valorizzati quando status === 'sold')
  soldPrice?: number | null
  soldAt?: string | null
  // ── Mercatino ────────────────────────────────────────────────────────────
  // Assente = 'library' (retrocompatibile con i libri già salvati)
  collection?: Collection
  // Prezzo a cui il libro è inserzionato nel mercatino
  listingPrice?: number | null
  // Quando è stato messo in vendita
  listedAt?: string | null
  // Dove è stato venduto (bancarella, fiera, eBay, Vinted…) — alimenta le statistiche
  soldChannel?: string | null
  // Edizione / collana (es. "1ª ed. Oscar Mondadori")
  edition?: string | null
  // Stato di conservazione del volume
  condition?: BookCondition | null
  createdAt: string
  updatedAt: string
}

export const BOOK_CONDITIONS = ['Nuovo', 'Come nuovo', 'Buono', 'Discreto', 'Da riparare'] as const
export type BookCondition = typeof BOOK_CONDITIONS[number]

// Canali di vendita suggeriti; l'utente può comunque scriverne uno personalizzato.
export const SALE_CHANNELS = [
  'Mercatino', 'Fiera del libro', 'Bancarella', 'eBay', 'Vinted',
  'Subito', 'Amazon', 'Libreria', 'Privato',
] as const

export interface MarketData {
  min: number
  max: number
  avg: number
  currency: string
  lastUpdated: string
  sources: MarketSource[]
}

export interface MarketSource {
  platform: string
  price: number
  url?: string
  condition?: string
  date?: string
}

export interface ScanResult {
  book: Partial<Book>
  confidence: number
  found: boolean
}

export interface AudioTrailer {
  url: string
  duration: number
  script: string
}

export interface SellListing {
  title: string
  description: string
  hashtags: string[]
  price: number
  platform: string
  imageUrl?: string
}

export interface Suggestion {
  title: string
  author: string
  cover?: string
  reason: string
  matchScore: number
  isbn?: string
  year?: number
  genre?: string
}

export const EMOTIONS = [
  'commovente', 'avvincente', 'profondo', 'leggero',
  'malinconico', 'ispirante', 'inquietante', 'divertente',
  'riflessivo', 'romantico', 'misterioso', 'storico',
] as const

export type Emotion = typeof EMOTIONS[number]

export const PLATFORMS = ['eBay', 'Catawiki', 'Vinted', 'Subito', 'Instagram'] as const
export type Platform = typeof PLATFORMS[number]
