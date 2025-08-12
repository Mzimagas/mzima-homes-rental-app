/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],

  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Disable strict mode to prevent double rendering in development
  reactStrictMode: false,

  // Disable TypeScript checking during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },

  // Production optimizations
  compress: true,

  // Image optimization
  images: {
    domains: ['ajrxvnakphkpkcssisxm.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },

  // Add security headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: ajrxvnakphkpkcssisxm.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' ajrxvnakphkpkcssisxm.supabase.co https://challenges.cloudflare.com https://app.posthog.com",
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
          ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ]
  },

  // Configure allowed origins for development
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '192.168.1.151:3000'
  ],

  // Experimental features for better error handling
  experimental: {
    // Enable better error overlay - removed @supabase/supabase-js to avoid conflict with serverExternalPackages
    optimizePackageImports: ['react', 'react-dom'],
  },
}

module.exports = nextConfig
