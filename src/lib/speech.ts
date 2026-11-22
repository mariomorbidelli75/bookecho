'use client'

// Voce del telefono (gratis): sceglie la migliore voce italiana disponibile.
// Le voci "Google", "Enhanced/Premium" e le voci naturali di Apple suonano
// molto meglio di quelle di base, quindi si preferiscono quando ci sono.

let cached: SpeechSynthesisVoice | null | undefined

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis
  const now = synth.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise(resolve => {
    const done = () => resolve(synth.getVoices())
    synth.addEventListener('voiceschanged', done, { once: true })
    setTimeout(done, 1200)
  })
}

export async function bestItalianVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cached !== undefined) return cached
  const voices = (await loadVoices()).filter(v => v.lang?.toLowerCase().startsWith('it'))
  const score = (v: SpeechSynthesisVoice) => {
    const n = v.name.toLowerCase()
    let s = 0
    if (/premium|enhanced|natural|neural|online/.test(n)) s += 4
    if (/google/.test(n)) s += 3
    if (/alice|federica|elsa|isabella|emma|paola|luca/.test(n)) s += 1
    if (v.localService) s += 0.5
    return s
  }
  cached = voices.sort((a, b) => score(b) - score(a))[0] ?? null
  return cached
}

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export async function speak(
  text: string,
  handlers: { onStart?: () => void; onEnd?: () => void; onProgress?: (fraction: number) => void } = {},
): Promise<void> {
  if (!speechAvailable()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'it-IT'
  u.rate = 0.95
  u.pitch = 1
  const voice = await bestItalianVoice()
  if (voice) u.voice = voice
  u.onstart = () => handlers.onStart?.()
  u.onend = () => handlers.onEnd?.()
  u.onerror = () => handlers.onEnd?.()
  u.onboundary = e => { if (text.length) handlers.onProgress?.(e.charIndex / text.length) }
  synth.speak(u)
}

export function stopSpeaking(): void {
  if (speechAvailable()) window.speechSynthesis.cancel()
}
