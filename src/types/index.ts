export type BookStatus = 'read' | 'reading' | 'to-read' | 'wishlist' | 'sold'

export interface Book {
  id: string
  title: string
  author: string
  isbn?: string | null
  publisher?: string | null
  year?: number | null
  cover?: string | null
  summary?: string | null
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
  createdAt: string
  updatedAt: string
}

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
