import { supabase } from '@/lib/supabase'
import type { Book } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// Libreria online: il telefono tiene una copia locale (veloce, funziona offline)
// e ogni modifica viene salvata anche su Supabase. All'accesso le due copie
// vengono unite: per ogni libro vince la versione modificata più di recente.
// ─────────────────────────────────────────────────────────────────────────────

const BOOKS_KEY = 'bookecho_books'
const DELETED_KEY = 'bookecho_deleted'   // { id: data cancellazione } da mandare online
const OWNER_KEY = 'bookecho_owner'       // a quale account appartengono i libri di questo telefono

interface Row {
  id: string
  data: Book
  deleted: boolean
  updated_at: string
}

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T } catch { return fallback }
}

async function userId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function toRow(book: Book) {
  return { id: book.id, data: book, deleted: false, updated_at: book.updatedAt }
}

// ── Salvataggio singolo (chiamato da storage.ts a ogni modifica) ─────────────
export async function pushBook(book: Book): Promise<void> {
  const uid = await userId()
  if (!supabase || !uid) return
  await supabase.from('books').upsert({ ...toRow(book), user_id: uid })
}

export function markDeleted(id: string): void {
  const del = readJson<Record<string, string>>(DELETED_KEY, {})
  del[id] = new Date().toISOString()
  localStorage.setItem(DELETED_KEY, JSON.stringify(del))
  void pushDeletes()
}

async function pushDeletes(): Promise<void> {
  const uid = await userId()
  const del = readJson<Record<string, string>>(DELETED_KEY, {})
  const ids = Object.keys(del)
  if (!supabase || !uid || ids.length === 0) return
  const { error } = await supabase.from('books').upsert(
    ids.map(id => ({ user_id: uid, id, data: { id }, deleted: true, updated_at: del[id] })),
  )
  if (!error) localStorage.removeItem(DELETED_KEY)
}

// ── Sincronizzazione completa (all'apertura dell'app e dopo l'accesso) ──────
// Restituisce true se i libri sul telefono sono cambiati.
let running: Promise<boolean> | null = null

export function syncLibrary(): Promise<boolean> {
  if (!running) running = doSync().finally(() => { running = null })
  return running
}

async function doSync(): Promise<boolean> {
  const uid = await userId()
  if (!supabase || !uid) return false

  // Un altro account ha usato questo telefono: i suoi libri non vanno mescolati
  const owner = localStorage.getItem(OWNER_KEY)
  if (owner && owner !== uid) {
    localStorage.removeItem(BOOKS_KEY)
    localStorage.removeItem(DELETED_KEY)
  }
  localStorage.setItem(OWNER_KEY, uid)

  await pushDeletes()

  const { data, error } = await supabase.from('books').select('id, data, deleted, updated_at')
  if (error) return false
  const remote = new Map((data as Row[]).map(r => [r.id, r]))
  const localBooks = readJson<Book[]>(BOOKS_KEY, [])
  const before = JSON.stringify(localBooks)

  const merged = new Map<string, Book>()
  const toUpload: Book[] = []

  for (const b of localBooks) {
    const r = remote.get(b.id)
    if (!r) { merged.set(b.id, b); toUpload.push(b); continue }
    const remoteNewer = new Date(r.updated_at).getTime() > new Date(b.updatedAt).getTime()
    if (r.deleted) {
      // Cancellato su un altro dispositivo, a meno che qui sia stato modificato dopo
      if (!remoteNewer) { merged.set(b.id, b); toUpload.push(b) }
    } else if (remoteNewer) merged.set(b.id, r.data)
    else {
      merged.set(b.id, b)
      if (new Date(b.updatedAt).getTime() > new Date(r.updated_at).getTime()) toUpload.push(b)
    }
  }
  for (const r of remote.values()) {
    if (!r.deleted && !merged.has(r.id)) merged.set(r.id, r.data)
  }

  // Più recenti in alto, come nell'app
  const list = [...merged.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  localStorage.setItem(BOOKS_KEY, JSON.stringify(list))

  for (let i = 0; i < toUpload.length; i += 50) {
    await supabase.from('books').upsert(toUpload.slice(i, i + 50).map(b => ({ ...toRow(b), user_id: uid })))
  }

  return JSON.stringify(list) !== before
}
