import { NextRequest, NextResponse } from 'next/server'
import { generateAudioScript } from '@/lib/ai'
import { generateAudio } from '@/lib/audio'
import { fetchWikipediaSummary } from '@/lib/books'
import type { Book } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { book } = await req.json() as { book: Book }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })

    // Fetch Wikipedia summary on-demand when the book has none (or too short to be useful)
    let enrichedBook = book
    let fetchedSummary: string | undefined
    if ((!book.summary || book.summary.length < 100) && book.title && book.author) {
      const wikiSummary = await fetchWikipediaSummary(book.title, book.author)
      if (wikiSummary) {
        fetchedSummary = wikiSummary
        enrichedBook = { ...book, summary: wikiSummary }
      }
    }

    const script = await generateAudioScript(enrichedBook)

    if (process.env.ELEVENLABS_API_KEY) {
      const audioBuffer = await generateAudio(script)
      if (audioBuffer) {
        return new NextResponse(audioBuffer.buffer as ArrayBuffer, {
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length.toString() }
        })
      }
    }

    // Return the script plus any freshly-fetched summary so the client can cache it
    return NextResponse.json({ script, summary: fetchedSummary })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore generazione' }, { status: 500 })
  }
}
