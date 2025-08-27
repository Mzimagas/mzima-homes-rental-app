import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import AuthWrapper from '../components/auth-wrapper'
import ClientAnalytics from '../components/ClientAnalytics'
import ErrorBoundary from '../components/ErrorBoundary'
import { ToastProvider } from '../components/ui/Toast'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'KodiRent',
  description: 'Comprehensive rental property management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <AuthWrapper>
            <ToastProvider>
              <ClientAnalytics />
              {children}
            </ToastProvider>
          </AuthWrapper>
        </ErrorBoundary>
      </body>
    </html>
  )
}
