import { NextRequest, NextResponse } from 'next/server'
import { generateAudioScript } from '@/lib/ai'
import { generateAudio } from '@/lib/audio'
import type { Book } from '@/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { book } = await req.json() as { book: Book }
    if (!book?.title) return NextResponse.json({ error: 'Dati libro mancanti' }, { status: 400 })

    const script = await generateAudioScript(book)

    if (process.env.ELEVENLABS_API_KEY) {
      const audioBuffer = await generateAudio(script)
      if (audioBuffer) {
        return new NextResponse(audioBuffer.buffer as ArrayBuffer, {
          headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length.toString() }
        })
      }
    }

    return NextResponse.json({ script })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Errore generazione' }, { status: 500 })
  }
}
