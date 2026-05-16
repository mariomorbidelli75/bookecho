import { NextRequest, NextResponse } from 'next/server'
import { getBook } from '@/lib/db'
import { generateAudioScript } from '@/lib/ai'
import { generateAudio } from '@/lib/audio'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const book = getBook(id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const script = await generateAudioScript(book)

  if (process.env.ELEVENLABS_API_KEY) {
    const audioBuffer = await generateAudio(script)
    if (audioBuffer) {
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
        }
      })
    }
  }

  return NextResponse.json({ script, demo: true })
}
