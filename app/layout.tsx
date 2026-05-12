import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CONTROVERSY ARCHIVE — Hidden Truth Engine',
  description: 'AI-powered investigative archive of the internet\'s most controversial topics',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🗂️</text></svg>",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen grid-bg antialiased">{children}</body>
    </html>
  )
}
