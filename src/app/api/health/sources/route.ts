import { NextResponse } from 'next/server'
import { searchGoogleBooksDetailed } from '@/lib/books'
import { cacheStatus } from '@/lib/book-cache'

// Stato delle fonti da cui dipendono copertine e trame.
// Quando una scheda resta vuota la domanda è sempre la stessa: è il libro che
// non c'è, o è una fonte che non risponde? Questa rotta risponde in un colpo
// solo, senza esporre nessuna chiave.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface Probe {
  fonte: string
  configurata: boolean
  ok: boolean
  ms: number
  nota?: string
}

async function probe(fonte: string, configurata: boolean, run: () => Promise<string | null>): Promise<Probe> {
  if (!configurata) return { fonte, configurata: false, ok: false, ms: 0, nota: 'chiave non impostata' }
  const t0 = Date.now()
  try {
    const nota = await run()
    return { fonte, configurata: true, ok: nota === null, ms: Date.now() - t0, ...(nota ? { nota } : {}) }
  } catch (e) {
    return { fonte, configurata: true, ok: false, ms: Date.now() - t0, nota: e instanceof Error ? e.message : 'errore' }
  }
}

export async function GET() {
  // ISBN di controllo: "Se questo è un uomo", presente in tutti i cataloghi.
  const ISBN = '9788806219352'

  const checks = await Promise.all([
    // Si usa la stessa funzione dell'app, con rotazione degli host e
    // ritentativi: quello che conta è se l'app riesce a leggere il catalogo,
    // non se la singola chiamata è andata a buon fine (la riga `googleVarianti`
    // qui sotto mostra comunque come rispondono i due host in questo momento).
    probe('Google Books', true, async () => {
      const { items, failed } = await searchGoogleBooksDetailed(`isbn:${ISBN}`)
      if (items.length > 0) {
        return process.env.GOOGLE_BOOKS_API_KEY
          ? null
          : 'funziona, ma senza chiave la quota pubblica si esaurisce in fretta'
      }
      return failed
        ? 'nessuno dei due host ha risposto dopo cinque tentativi'
        : 'risposta vuota per un ISBN che esiste'
    }),

    probe('Open Library', true, async () => {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${ISBN}&format=json&jscmd=data`, {
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) return `HTTP ${res.status}`
      return (await res.json())[`ISBN:${ISBN}`] ? null : 'risposta vuota'
    }),

    probe('Wikipedia', true, async () => {
      const res = await fetch('https://it.wikipedia.org/api/rest_v1/page/summary/Se_questo_%C3%A8_un_uomo', {
        signal: AbortSignal.timeout(12000),
      })
      return res.ok ? null : `HTTP ${res.status}`
    }),

    probe('Anthropic (lettura foto e sintesi)', Boolean(process.env.ANTHROPIC_API_KEY), async () => {
      const res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
        signal: AbortSignal.timeout(12000),
      })
      if (res.status === 401) return 'chiave non valida'
      if (!res.ok) return `HTTP ${res.status}`
      return null
    }),

    probe('Google Vision (OCR di riserva)', Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY), async () => null),

    // Si prova proprio la sintesi vocale, non il profilo utente: le chiavi
    // ElevenLabs sono a permessi separati e una chiave può benissimo saper
    // parlare senza poter leggere l'anagrafica dell'account.
    probe('ElevenLabs (voce)', Boolean(process.env.ELEVENLABS_API_KEY), async () => {
      const voiceId = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Prova.', model_id: 'eleven_multilingual_v2' }),
        signal: AbortSignal.timeout(20000),
      })
      if (res.ok) return null
      const detail = await res.text()
      if (res.status === 401) {
        return /permission/i.test(detail)
          ? 'la chiave non ha il permesso text_to_speech'
          : 'chiave non valida'
      }
      if (res.status === 402) return 'credito esaurito: ricarica su elevenlabs.io'
      if (res.status === 429) return 'quota esaurita'
      return `HTTP ${res.status}`
    }),
  ])

  // Google Books risponde in modo diverso a seconda dell'host e dei parametri,
  // e dai datacenter capita che rifiuti le richieste. Qui si vede quale
  // variante passa: è così che si è scelto l'host usato in produzione.
  const key = process.env.GOOGLE_BOOKS_API_KEY
  const varianti = await Promise.all(
    [
      ['www.googleapis.com', ''],
      ['www.googleapis.com', '&country=IT'],
      ['books.googleapis.com', ''],
      ['books.googleapis.com', '&country=IT'],
    ].map(async ([host, extra]) => {
      const t0 = Date.now()
      try {
        const res = await fetch(
          `https://${host}/books/v1/volumes?q=isbn:${ISBN}${key ? `&key=${key}` : ''}${extra}`,
          { signal: AbortSignal.timeout(12000) }
        )
        const items = res.ok ? ((await res.json()).items ?? []) : []
        return { variante: `${host}${extra}`, http: res.status, risultati: items.length, ms: Date.now() - t0 }
      } catch (e) {
        return { variante: `${host}${extra}`, http: 0, risultati: 0, ms: Date.now() - t0, nota: e instanceof Error ? e.name : 'errore' }
      }
    })
  )

  const essenziali = checks.filter(c => ['Google Books', 'Open Library', 'Wikipedia'].includes(c.fonte))
  return NextResponse.json({
    // L'archivio delle schede è la vera rete di sicurezza: finché regge, un
    // catalogo muto non si vede nemmeno.
    stato: essenziali.every(c => c.ok) ? 'ok' : essenziali.some(c => c.ok) ? 'degradato' : 'ko',
    verificato: new Date().toISOString(),
    archivioSchede: cacheStatus(),
    fonti: checks,
    googleVarianti: varianti,
  })
}
