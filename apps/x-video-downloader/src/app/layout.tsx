import '@fontsource-variable/geist'
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Video Link',
  description: 'Private X video downloader',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
