import { get, put } from '@vercel/blob'

// Archivio delle schede già ricostruite, su Vercel Blob.
//
// Il problema che risolve: dai server di Vercel, Google Books rifiuta circa due
// richieste su tre. Una scheda però va costruita una volta sola — i dati
// bibliografici non cambiano — e da lì in poi non deve più dipendere da
// nessuno. Il primo utente che scansiona un libro lo "sblocca" per tutti:
// alla seconda lettura la risposta arriva dall'archivio in un colpo solo,
// anche se in quel momento Google è muto.
//
// I dati qui dentro sono bibliografici (titolo, editore, trama, copertina),
// non sono di nessun utente: la condivisione è voluta.

const PREFIX = 'schede'
const TTL_MS = 180 * 24 * 60 * 60 * 1000   // sei mesi: poi si ricontrolla
const MEM_MAX = 200

export interface CachedSheet {
  // Livello con cui è stata costruita: una scheda 'light' (solo cataloghi) non
  // può soddisfare una richiesta completa, il contrario sì.
  level: 'light' | 'full'
  at: string
  book: Record<string, unknown>
}

// Primo livello, in memoria: la stessa istanza serve più richieste vicine
// (scansione di uno scaffale) e non ha senso interrogare Blob ogni volta.
const memory = new Map<string, CachedSheet>()

function enabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Chiavi di ricerca: per ISBN quando c'è, altrimenti per titolo e autore.
// Una scheda viene salvata sotto entrambe, così la si ritrova comunque la si
// cerchi (dal codice a barre o dal dorso letto in una foto).
export function cacheKeys(seed: { isbn?: string | null; title?: string | null; author?: string | null }): string[] {
  const keys: string[] = []
  const isbn = (seed.isbn ?? '').replace(/[^0-9xX]/g, '')
  if (isbn.length >= 10) keys.push(`${PREFIX}/isbn/${isbn}.json`)

  const title = seed.title?.trim()
  if (title) {
    const author = seed.author?.trim()
    const authorPart = author && author !== 'Autore sconosciuto' ? slug(author) : 'anonimo'
    keys.push(`${PREFIX}/titolo/${slug(title)}--${authorPart}.json`)
  }
  return keys
}

function fresh(entry: CachedSheet, level: 'light' | 'full'): boolean {
  if (Date.now() - new Date(entry.at).getTime() > TTL_MS) return false
  // Una scheda leggera non basta a chi ha chiesto la ricerca completa.
  return level === 'light' || entry.level === 'full'
}

export async function readSheet(
  seed: { isbn?: string | null; title?: string | null; author?: string | null },
  level: 'light' | 'full'
): Promise<Record<string, unknown> | null> {
  const keys = cacheKeys(seed)

  for (const key of keys) {
    const local = memory.get(key)
    if (local && fresh(local, level)) return local.book
  }
  if (!enabled()) return null

  for (const key of keys) {
    try {
      const blob = await get(key, { access: 'private' })
      if (!blob || blob.statusCode !== 200 || !blob.stream) continue
      const entry = JSON.parse(await new Response(blob.stream).text()) as CachedSheet
      if (!entry?.book || !fresh(entry, level)) continue
      if (memory.size >= MEM_MAX) memory.clear()
      memory.set(key, entry)
      return entry.book
    } catch {
      // Archivio non raggiungibile: si prosegue interrogando le fonti.
    }
  }
  return null
}

export async function writeSheet(
  book: Record<string, unknown>,
  level: 'light' | 'full'
): Promise<void> {
  const entry: CachedSheet = { level, at: new Date().toISOString(), book }
  const keys = cacheKeys({
    isbn: book.isbn as string | null,
    title: book.title as string | null,
    author: book.author as string | null,
  })

  for (const key of keys) {
    if (memory.size >= MEM_MAX) memory.clear()
    memory.set(key, entry)
  }
  if (!enabled()) return

  await Promise.all(keys.map(async key => {
    try {
      await put(key, JSON.stringify(entry), {
        access: 'private',
        contentType: 'application/json',
        allowOverwrite: true,
        addRandomSuffix: false,
      })
    } catch {
      // Salvare è un di più: se fallisce, la scheda è già stata consegnata.
    }
  }))
}

// Una scheda si archivia solo se vale la pena riproporla: deve venire da un
// catalogo e avere almeno copertina o trama. Le copertine che sono la foto
// dell'utente non si condividono con nessuno.
export function worthCaching(book: {
  matched?: boolean
  cover?: unknown
  summary?: unknown
  sources?: Record<string, string>
}): boolean {
  if (!book.matched) return false
  if (book.sources?.cover === 'photo') return false
  return Boolean(book.cover || book.summary)
}

export function cacheStatus(): { attivo: boolean; inMemoria: number } {
  return { attivo: enabled(), inMemoria: memory.size }
}
