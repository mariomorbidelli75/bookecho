import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/server-auth'
import { enrichBook } from '@/lib/enrich'

// Completa una scheda già salvata: si interrogano di nuovo tutte le fonti
// partendo da quello che il libro ha già (ISBN se c'è, altrimenti titolo e
// autore). Serve per i libri aggiunti quando una fonte era muta o incompleta.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const auth = await requireUser(req, 'enrich')
  if (auth instanceof NextResponse) return auth

  try {
    const { title, author, isbn } = await req.json() as {
      title?: string; author?: string; isbn?: string | null
    }

    if (!title && !isbn) {
      return NextResponse.json({ error: 'Servono almeno il titolo o l\'ISBN' }, { status: 400 })
    }

    const book = await enrichBook({ title, author, isbn }, { level: 'full', allowAi: true })

    if (!book.matched && !book.summary && !book.cover) {
      return NextResponse.json(
        { error: 'Nessuna fonte ha dati su questo libro. Prova a correggere titolo e autore, o inserisci l\'ISBN.' },
        { status: 404 }
      )
    }

    return NextResponse.json(book)
  } catch (e) {
    console.error('Enrich error:', e)
    return NextResponse.json({ error: 'Completamento non riuscito' }, { status: 500 })
  }
}
