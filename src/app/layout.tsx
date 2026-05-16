import type { Metadata, Viewport } from 'next'
import './globals.css'

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
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
