import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Protezione delle API: solo chi ha fatto l'accesso può usarle, e le funzioni
// AI (che costano) hanno un limite giornaliero per persona.
// ─────────────────────────────────────────────────────────────────────────────

export const AI_LIMITS = {
  scan: 60,       // foto della copertina
  shelf: 15,      // foto dello scaffale
  enrich: 150,    // completamento schede (l'AI scrive la trama solo se manca)
  suggest: 20,    // consigli di lettura
  listing: 30,    // annunci di vendita
  audio: 30,      // trailer
  market: 30,     // valutazioni di prezzo
} as const

export type AiKind = keyof typeof AI_LIMITS

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Restituisce l'id dell'utente, oppure una risposta di errore da restituire subito.
 * Uso: const auth = await requireUser(req, 'scan'); if (auth instanceof NextResponse) return auth
 */
export async function requireUser(req: NextRequest, kind?: AiKind): Promise<{ userId: string } | NextResponse> {
  if (!url || !key) {
    return NextResponse.json({ error: 'Servizio non configurato' }, { status: 503 })
  }
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Accedi per usare questa funzione.' }, { status: 401 })

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return NextResponse.json({ error: 'Sessione scaduta: accedi di nuovo.' }, { status: 401 })

  if (kind) {
    const { data: ok, error: qErr } = await sb.rpc('use_ai_quota', { p_kind: kind, p_max: AI_LIMITS[kind] })
    if (qErr) {
      console.error('use_ai_quota', qErr.message)
      return NextResponse.json({ error: 'Servizio momentaneamente non disponibile.' }, { status: 503 })
    }
    if (!ok) {
      return NextResponse.json(
        { error: `Hai raggiunto il limite giornaliero per questa funzione (${AI_LIMITS[kind]} al giorno). Riprova domani.` },
        { status: 429 },
      )
    }
  }
  return { userId: data.user.id }
}
