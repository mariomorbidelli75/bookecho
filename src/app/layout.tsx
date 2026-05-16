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
  title: 'BookEcho — La libreria intelligente dei collezionisti',
  description: 'Scansiona libri, ascolta trailer audio, scopri il valore di mercato e crea annunci per i marketplace.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'BookEcho' },
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
      <body style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}>{children}</body>
    </html>
  )
}
