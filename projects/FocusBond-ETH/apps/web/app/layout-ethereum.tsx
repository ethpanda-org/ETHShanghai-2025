import { EthereumProvider } from './providers-ethereum'
import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'FocusBond - Time-Bonded Attention',
  description: 'Commit to focused work sessions with crypto incentives',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <EthereumProvider>{children}</EthereumProvider>
      </body>
    </html>
  )
}
