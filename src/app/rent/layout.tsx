import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Available Rentals | Mzima Homes',
  description: 'Browse available rental units and find your perfect home with Mzima Homes. View photos, amenities, and submit reservation requests.',
  keywords: 'rental, apartments, houses, Mzima Homes, available units',
  openGraph: {
    title: 'Available Rentals | Mzima Homes',
    description: 'Browse available rental units and find your perfect home',
    type: 'website',
  }
}

export default function RentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="bg-elevated shadow-sm border-b border-light backdrop-blur-sm bg-white/95">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-primary">Mzima Homes</h1>
              <span className="text-sm text-tertiary hidden sm:inline">Find Your Perfect Home</span>
            </div>
            <nav className="flex items-center space-x-6">
              <a href="/rent" className="text-secondary hover:text-primary transition-colors font-medium">Browse Units</a>
              <a href="/dashboard" className="btn btn-primary">Property Manager</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-elevated border-t border-light mt-16">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-primary mb-4">Mzima Homes</h3>
              <p className="text-secondary text-sm leading-relaxed">
                Professional property management and rental services. Find your perfect home with us.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-4">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/rent" className="text-secondary hover:text-brand transition-colors">Browse Units</a></li>
                <li><a href="/rent?amenities=PARKING" className="text-secondary hover:text-brand transition-colors">Units with Parking</a></li>
                <li><a href="/rent?amenities=BALCONY" className="text-secondary hover:text-brand transition-colors">Units with Balcony</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-primary mb-4">Contact</h4>
              <div className="text-sm text-secondary space-y-2">
                <p className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  info@mzimahomes.com
                </p>
                <p className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +254 700 000 000
                </p>
                <p className="text-tertiary">Available 24/7 for inquiries</p>
              </div>
            </div>
          </div>
          <div className="border-t border-light mt-8 pt-6 text-center text-sm text-tertiary">
            <p>&copy; 2024 Mzima Homes. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
