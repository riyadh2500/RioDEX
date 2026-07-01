import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import WagmiProvider from '@/providers/WagmiProvider'
import Navbar from '@/components/Navbar'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'RioDex — Decentralised Exchange',
  description: 'Send tokens, provide liquidity, and get testnet funds on RioDex.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-dex-bg text-dex-text antialiased`}>
        <WagmiProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: 'bg-dex-surface border border-dex-border text-dex-text shadow-card-md',
                title: 'text-dex-text font-medium',
                description: 'text-dex-muted text-sm',
              },
            }}
          />
        </WagmiProvider>
      </body>
    </html>
  )
}
