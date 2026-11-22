'use client'
import { useEffect, useState } from 'react'

// Installazione di Librò come app sul telefono (PWA).
// Android/Chrome: proposta vera di installazione (catturata in layout.tsx).
// iPhone/iPad: Apple non la permette, si mostrano le istruzioni "Aggiungi a Home".

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window { __installPrompt?: InstallPromptEvent }
}

export type Platform = 'installed' | 'android' | 'ios' | 'other'

export function useInstall() {
  const [platform, setPlatform] = useState<Platform>('other')
  const [canPrompt, setCanPrompt] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
    setPlatform(standalone ? 'installed' : ios ? 'ios' : /Android/i.test(ua) ? 'android' : 'other')

    const update = () => setCanPrompt(!!window.__installPrompt)
    update()
    window.addEventListener('libro-installable', update)
    return () => window.removeEventListener('libro-installable', update)
  }, [])

  const install = async (): Promise<boolean> => {
    const ev = window.__installPrompt
    if (!ev) return false
    await ev.prompt()
    const { outcome } = await ev.userChoice
    window.__installPrompt = undefined
    setCanPrompt(false)
    return outcome === 'accepted'
  }

  return { platform, canPrompt, install }
}
