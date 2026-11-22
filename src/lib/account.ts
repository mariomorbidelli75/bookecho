import { supabase } from '@/lib/supabase'
import { syncLibrary } from '@/lib/cloud-books'
import type { Book } from '@/types'
import type { Friend } from '@/lib/social'

// ─────────────────────────────────────────────────────────────────────────────
// Account reali (Supabase): registrazione, accesso, profilo, amici lettori.
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_INVITE_KEY = 'libro_pending_invite'
const COLORS = ['#1E4D3A', '#E89B4C', '#4A8B6F', '#9B59B6', '#C8542A', '#0B5FA5']

export interface MyProfile {
  id: string
  name: string
  ref_code: string
  sharing: boolean
}

function need() {
  if (!supabase) throw new Error('Registrazione non ancora attiva: mancano le chiavi Supabase.')
  return supabase
}

// Messaggi d'errore di Supabase tradotti in italiano semplice
export function errorText(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (/invalid login credentials/i.test(msg)) return 'Email o password sbagliate.'
  if (/already registered|already exists/i.test(msg)) return 'Questa email è già registrata: usa "Ho già un account".'
  if (/password should be at least/i.test(msg)) return 'La password deve avere almeno 6 caratteri.'
  if (/email not confirmed/i.test(msg)) return 'Conferma prima l\'email: ti abbiamo mandato un link.'
  if (/invalid.*email|unable to validate email/i.test(msg)) return 'Controlla l\'indirizzo email.'
  if (/rate limit/i.test(msg)) return 'Troppi tentativi, riprova tra qualche minuto.'
  return msg
}

// ── Invito in sospeso (sopravvive al passaggio login / conferma email) ──────
export function setPendingInvite(code: string) {
  try { localStorage.setItem(PENDING_INVITE_KEY, code.toUpperCase()) } catch {}
}
function takePendingInvite(): string | null {
  try {
    const c = localStorage.getItem(PENDING_INVITE_KEY)
    localStorage.removeItem(PENDING_INVITE_KEY)
    return c
  } catch { return null }
}

// ── Sessione ────────────────────────────────────────────────────────────────
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function signUp(name: string, email: string, password: string, invite?: string) {
  const sb = need()
  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: name.trim(), invite: invite?.toUpperCase() ?? '' },
      emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/app/friends` : undefined,
    },
  })
  if (error) throw error
  // Con la conferma email attiva non c'è ancora sessione: l'amicizia è comunque
  // già salvata dal database al momento della registrazione.
  return { needsConfirm: !data.session }
}

export async function signIn(email: string, password: string, invite?: string) {
  const sb = need()
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  const code = invite ?? takePendingInvite()
  if (code) await acceptInvite(code)
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
}

// Esci dall'account e libera il telefono: libri, nome e foto restano salvati
// online e tornano al prossimo accesso. Così chi entra dopo (un'altra persona
// sullo stesso telefono) parte da zero e non vede i dati di chi è uscito.
export async function logout() {
  try { await syncLibrary() } catch {}
  await signOut()
  for (const k of [
    'bookecho_books', 'bookecho_deleted', 'bookecho_owner',
    'libro_friends', 'libro_sharing', 'libro_refcode', 'libro_username', 'libro_avatar', PENDING_INVITE_KEY,
  ]) {
    try { localStorage.removeItem(k) } catch {}
  }
}

export async function currentAccount(): Promise<{ id: string; email: string } | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const u = data.session?.user
  return u ? { id: u.id, email: u.email ?? '' } : null
}

// ── Inviti ──────────────────────────────────────────────────────────────────
export async function inviterName(code: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.rpc('inviter_name', { code })
  return (data as string | null) ?? null
}

export async function acceptInvite(code: string): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.rpc('accept_invite', { code })
  return (data as string | null) ?? null
}

// Da chiamare all'apertura della pagina amici: se c'era un invito in sospeso lo usa
export async function consumePendingInvite() {
  const code = takePendingInvite()
  if (code && await currentUserId()) await acceptInvite(code)
}

// ── Profilo ─────────────────────────────────────────────────────────────────
export async function getMyProfile(): Promise<MyProfile | null> {
  if (!supabase || !(await currentUserId())) return null
  const { data } = await supabase.from('profiles').select('id, name, ref_code, sharing').single()
  return (data as MyProfile | null) ?? null
}

export async function updateMyProfile(updates: Partial<Pick<MyProfile, 'name' | 'sharing'>>) {
  const id = await currentUserId()
  if (!supabase || !id) return
  await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

// Pubblica sul profilo il libro che sto leggendo e i generi preferiti,
// così gli amici lo vedono nella loro lista.
export async function syncMyReading(books: Book[]) {
  const id = await currentUserId()
  if (!supabase || !id) return
  const reading = books
    .filter(b => b.status === 'reading')
    .sort((a, b) => (b.readingStartedAt ?? b.updatedAt).localeCompare(a.readingStartedAt ?? a.updatedAt))[0]
  const counts = new Map<string, number>()
  for (const b of books) if (b.genre) counts.set(b.genre, (counts.get(b.genre) ?? 0) + 1)
  const genres = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([g]) => g)
  const current_book = reading
    ? { title: reading.title, author: reading.author, genre: reading.genre ?? undefined, cover: reading.cover?.startsWith('http') ? reading.cover : undefined }
    : null
  await supabase.from('profiles').update({ current_book, genres, updated_at: new Date().toISOString() }).eq('id', id)
}

// ── Amici ───────────────────────────────────────────────────────────────────
interface FriendRow {
  id: string
  name: string
  current_book: Friend['currentBook'] | null
  genres: string[] | null
  joined_at: string
  updated_at: string
}

export async function fetchFriends(): Promise<Friend[]> {
  if (!supabase || !(await currentUserId())) return []
  const { data, error } = await supabase.rpc('my_friends')
  if (error) throw error
  return ((data ?? []) as FriendRow[]).map((r, i) => ({
    id: r.id,
    name: r.name,
    color: COLORS[i % COLORS.length],
    currentBook: r.current_book,
    favoriteGenres: r.genres ?? [],
    joinedAt: r.joined_at,
    updatedAt: r.updated_at,
  }))
}

export async function unfriend(friendId: string) {
  const id = await currentUserId()
  if (!supabase || !id) return
  await supabase.from('friendships').delete().eq('user_id', id).eq('friend_id', friendId)
}

export function inviteLink(refCode: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://bookecho-iota.vercel.app'
  return `${base}/invito/${refCode}`
}
