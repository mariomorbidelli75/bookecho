import { NextResponse } from 'next/server'

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
    probe('Google Books', true, async () => {
      const key = process.env.GOOGLE_BOOKS_API_KEY
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${ISBN}${key ? `&key=${key}` : ''}`
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
      if (!res.ok) {
        const detail = res.status === 400 ? 'chiave rifiutata' : res.status === 429 ? 'quota esaurita' : 'servizio non disponibile'
        return `HTTP ${res.status} — ${detail}${key ? '' : ' (nessuna chiave: si usa la quota pubblica condivisa)'}`
      }
      const items = (await res.json()).items ?? []
      if (items.length === 0) return 'risposta vuota per un ISBN che esiste'
      return key ? null : 'funziona ma senza chiave: la quota pubblica va in 429 con poche richieste'
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

    probe('ElevenLabs (voce)', Boolean(process.env.ELEVENLABS_API_KEY), async () => {
      const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '' },
        signal: AbortSignal.timeout(12000),
      })
      if (res.status === 401) return 'chiave non valida'
      return res.ok ? null : `HTTP ${res.status}`
    }),
  ])

  const essenziali = checks.filter(c => ['Google Books', 'Open Library', 'Wikipedia'].includes(c.fonte))
  return NextResponse.json({
    stato: essenziali.every(c => c.ok) ? 'ok' : essenziali.some(c => c.ok) ? 'degradato' : 'ko',
    verificato: new Date().toISOString(),
    fonti: checks,
  })
}
