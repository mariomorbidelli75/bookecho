import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Librò — tutti i libri in un posto solo',
  description: 'Tutti i libri in un posto solo. Scansiona libri, ascolta trailer audio, scopri il valore di mercato e crea annunci per i marketplace.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Librò' },
  icons: { icon: '/icon-192.png', apple: '/icon-512.png' },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F5F1E8',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        {/* Cattura subito la proposta di installazione (Android/Chrome) e registra il service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event('libro-installable'))});if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </head>
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>{children}</body>
    </html>
  )
}
