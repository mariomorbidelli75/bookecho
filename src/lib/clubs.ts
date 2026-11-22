import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Book club della community: il club vive nell'app (libro, argomento, iscritti),
// la conversazione su un gruppo Telegram creato da chi apre il club.
// ─────────────────────────────────────────────────────────────────────────────

export interface ClubBook {
  title: string
  author: string
  cover?: string
  isbn?: string
}

export interface Club {
  id: string
  name: string
  topic: string
  description: string | null
  book: ClubBook
  telegram_url: string
  created_at: string
  creator_id: string
  creator_name: string
  members: number
  am_member: boolean
  mine: boolean
}

export const TOPICS = [
  'Romanzi', 'Gialli e thriller', 'Fantasy e fantascienza', 'Classici', 'Saggistica',
  'Storia', 'Poesia', 'Fumetti e graphic novel', 'Ragazzi', 'Crescita personale', 'Altro',
]

// Link d'invito Telegram accettati: t.me/+codice, t.me/joinchat/codice, t.me/nomegruppo
export function normalizeTelegramLink(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  s = s.replace(/^http:\/\//i, 'https://')
  if (!/^https:\/\//i.test(s)) s = `https://${s}`
  s = s.replace(/^https:\/\/(www\.)?telegram\.me\//i, 'https://t.me/').replace(/^https:\/\/www\.t\.me\//i, 'https://t.me/')
  s = s.split(/[?#\s]/)[0].replace(/\/+$/, '')
  return /^https:\/\/t\.me\/[A-Za-z0-9_+/-]{3,}$/.test(s) ? s : null
}

function need() {
  if (!supabase) throw new Error('Community non ancora attiva.')
  return supabase
}

export async function listClubs(): Promise<Club[]> {
  const { data, error } = await need().rpc('list_book_clubs')
  if (error) throw error
  return (data ?? []) as Club[]
}

export async function getClub(id: string): Promise<Club | null> {
  return (await listClubs()).find(c => c.id === id) ?? null
}

export async function createClub(input: {
  name: string; topic: string; description?: string; book: ClubBook; telegramUrl: string
}): Promise<string> {
  const url = normalizeTelegramLink(input.telegramUrl)
  if (!url) throw new Error('Il link deve essere un invito Telegram, tipo https://t.me/+AbC123')
  const { data, error } = await need().from('book_clubs').insert({
    name: input.name.trim(),
    topic: input.topic,
    description: input.description?.trim() || null,
    book: input.book,
    telegram_url: url,
  }).select('id').single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updateClub(id: string, changes: { name?: string; description?: string | null; telegramUrl?: string }) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (changes.name !== undefined) patch.name = changes.name.trim()
  if (changes.description !== undefined) patch.description = changes.description?.trim() || null
  if (changes.telegramUrl !== undefined) {
    const url = normalizeTelegramLink(changes.telegramUrl)
    if (!url) throw new Error('Il link deve essere un invito Telegram, tipo https://t.me/+AbC123')
    patch.telegram_url = url
  }
  const { error } = await need().from('book_clubs').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteClub(id: string) {
  const { error } = await need().from('book_clubs').delete().eq('id', id)
  if (error) throw error
}

async function myId(): Promise<string> {
  const { data } = await need().auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new Error('Accedi per partecipare.')
  return id
}

export async function joinClub(id: string) {
  await need().from('book_club_members').upsert({ club_id: id, user_id: await myId() }, { ignoreDuplicates: true })
}

export async function leaveClub(id: string) {
  await need().from('book_club_members').delete().eq('club_id', id).eq('user_id', await myId())
}

export async function reportClub(id: string, reason: string) {
  const { error } = await need().from('book_club_reports').insert({ club_id: id, reason: reason.slice(0, 300) })
  // Già segnalato da me: va bene così
  if (error && !/duplicate/i.test(error.message)) throw error
}
