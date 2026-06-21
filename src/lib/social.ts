import type { Book } from '@/types'
import { getBooks } from '@/lib/storage'

// ─────────────────────────────────────────────────────────────────────────────
// Rete di amici: condivisione libri, match su ciò che leggono, scambio.
// Demo client-side (localStorage). In produzione questi dati arriverebbero da un
// backend con account reali; qui le attività degli amici sono simulate.
// ─────────────────────────────────────────────────────────────────────────────

export interface Friend {
  id: string
  name: string
  color: string
  /** Ultimo libro che l'amico sta leggendo (condiviso) */
  currentBook: { title: string; author: string; genre?: string; cover?: string }
  /** Generi preferiti, usati per il match di affinità */
  favoriteGenres: string[]
  /** Quando ha aggiornato l'ultima lettura */
  updatedAt: string
  /** Quando si è iscritto a Librò con il tuo invito */
  joinedAt: string
}

const FRIENDS_KEY = 'libro_friends'
const SHARE_KEY = 'libro_sharing'
const REF_KEY = 'libro_refcode'
const NAME_KEY = 'libro_username'
const AVATAR_KEY = 'libro_avatar'

const COLORS = ['#1E4D3A', '#E89B4C', '#4A8B6F', '#9B59B6', '#C8542A', '#0B5FA5']

// Piccolo pool di letture per simulare l'attività degli amici condivisi.
const DEMO_READS: Friend['currentBook'][] = [
  { title: 'Il barone rampante', author: 'Italo Calvino', genre: 'Romanzo' },
  { title: 'La coscienza di Zeno', author: 'Italo Svevo', genre: 'Romanzo' },
  { title: 'Se questo è un uomo', author: 'Primo Levi', genre: 'Memoir' },
  { title: 'Il deserto dei Tartari', author: 'Dino Buzzati', genre: 'Romanzo' },
  { title: 'Le città invisibili', author: 'Italo Calvino', genre: 'Narrativa' },
  { title: 'La luna e i falò', author: 'Cesare Pavese', genre: 'Romanzo' },
  { title: 'Cristo si è fermato a Eboli', author: 'Carlo Levi', genre: 'Memoir' },
  { title: 'Uno, nessuno e centomila', author: 'Luigi Pirandello', genre: 'Romanzo' },
]

const DEMO_GENRES = ['Romanzo', 'Giallo', 'Storico', 'Fantasy', 'Saggio', 'Poesia', 'Narrativa', 'Memoir']

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function getFriends(): Friend[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(FRIENDS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveFriends(friends: Friend[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

export function addFriend(name: string): Friend {
  const friends = getFriends()
  const genres = [rand(DEMO_GENRES), rand(DEMO_GENRES)].filter((g, i, a) => a.indexOf(g) === i)
  const now = new Date().toISOString()
  const friend: Friend = {
    id: `fr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Amico',
    color: COLORS[friends.length % COLORS.length],
    currentBook: rand(DEMO_READS),
    favoriteGenres: genres,
    updatedAt: now,
    joinedAt: now,
  }
  saveFriends([friend, ...friends])
  return friend
}

export function removeFriend(id: string): void {
  saveFriends(getFriends().filter(f => f.id !== id))
}

// Affinità 0–100 tra la libreria dell'utente e ciò che legge l'amico.
export function matchScore(friend: Friend, myBooks: Book[] = getBooks()): number {
  if (myBooks.length === 0) return 0
  const myGenres = new Set(myBooks.map(b => (b.genre ?? '').toLowerCase()).filter(Boolean))
  const myAuthors = new Set(myBooks.map(b => (b.author ?? '').toLowerCase()).filter(Boolean))

  let score = 0
  const friendGenres = [friend.currentBook.genre, ...friend.favoriteGenres]
    .filter(Boolean)
    .map(g => (g as string).toLowerCase())

  for (const g of friendGenres) {
    if ([...myGenres].some(mg => mg.includes(g) || g.includes(mg))) score += 25
  }
  if (myAuthors.has(friend.currentBook.author.toLowerCase())) score += 40
  // Bonus se possiedo proprio quel libro (potenziale scambio diretto)
  if (myBooks.some(b => b.title.toLowerCase() === friend.currentBook.title.toLowerCase())) score += 20

  return Math.min(100, score || 15)
}

// Trovo i libri che possiedo e che l'amico potrebbe voler leggere (per scambio).
export function swapCandidates(friend: Friend, myBooks: Book[] = getBooks()): Book[] {
  const wanted = [friend.currentBook.genre, ...friend.favoriteGenres]
    .filter(Boolean)
    .map(g => (g as string).toLowerCase())
  return myBooks
    .filter(b => b.status === 'read')
    .filter(b => {
      const g = (b.genre ?? '').toLowerCase()
      return wanted.some(w => g.includes(w) || w.includes(g))
    })
    .slice(0, 3)
}

// ── Sharing: l'utente condivide cosa legge con gli amici collegati ──────────
export function isSharing(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SHARE_KEY) !== 'off'
}

export function setSharing(on: boolean): void {
  localStorage.setItem(SHARE_KEY, on ? 'on' : 'off')
}

// Codice referral personale, stabile per dispositivo.
export function getRefCode(): string {
  if (typeof window === 'undefined') return 'LIBRO'
  let code = localStorage.getItem(REF_KEY)
  if (!code) {
    code = `LIBRO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    localStorage.setItem(REF_KEY, code)
  }
  return code
}

export function inviteUrl(): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://bookecho-iota.vercel.app'
  return `${base}/app?invito=${getRefCode()}`
}

// ── Profilo utente: nome e immagine personalizzabili ────────────────────────
export function getMyName(): string {
  if (typeof window === 'undefined') return 'Mario'
  return localStorage.getItem(NAME_KEY) || 'Mario'
}

export function setMyName(name: string): void {
  localStorage.setItem(NAME_KEY, name)
}

export function getMyAvatar(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AVATAR_KEY)
}

export function setMyAvatar(dataUrl: string): void {
  localStorage.setItem(AVATAR_KEY, dataUrl)
}

export function clearMyAvatar(): void {
  localStorage.removeItem(AVATAR_KEY)
}
