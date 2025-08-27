/** @type {import('next').NextConfig} */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
let SUPABASE_HOST = 'ajrxvnakphkpkcssisxm.supabase.co'
try {
  if (SUPABASE_URL) SUPABASE_HOST = new URL(SUPABASE_URL).host
} catch {}

const nextConfig = {
  typescript: {
    // Enable strict type checking during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Enable ESLint during build for code quality
    ignoreDuringBuilds: false,
  },
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],

  // Ensure environment variables are available to the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Enable strict mode in development to catch side effects
  reactStrictMode: true,

  // Production optimizations
  compress: true,

  // Image optimization
  images: {
    domains: [SUPABASE_HOST],
    formats: ['image/webp', 'image/avif'],
  },

  // Add security headers
  async headers() {
    const isProd = process.env.NODE_ENV === 'production'
    const csp = [
      "default-src 'self'",
      // Allow minimal inline needed by Next.js runtime and blob: for dynamic chunks/workers
      // In development, allow 'unsafe-eval' for React refresh utilities
      `script-src 'self' 'unsafe-inline' ${isProd ? '' : "'unsafe-eval'"} blob: https://challenges.cloudflare.com https://www.google-analytics.com https://*.googletagmanager.com`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://${SUPABASE_HOST}`,
      "font-src 'self' data:",
      // Allow HTTPS and WSS to Supabase, plus other required endpoints
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://challenges.cloudflare.com https://app.posthog.com https://*.posthog.com https://nominatim.openstreetmap.org https://vitals.vercel-insights.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.googletagmanager.com`,
      "worker-src 'self' blob:",
      'frame-src https://challenges.cloudflare.com https://www.google.com',
      "frame-ancestors 'none'",
      "object-src 'none'",
      "form-action 'self'",
      ...(isProd ? ['upgrade-insecure-requests'] : []),
      "base-uri 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: csp },
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
        ],
      },
    ]
  },

  // Configure allowed origins for development
  allowedDevOrigins: ['localhost:3000', '127.0.0.1:3000', '192.168.1.151:3000'],

  // Bundle optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer (only in development)
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      )
    }

    // Optimize chunks
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
            // CQRS chunk
            cqrs: {
              test: /[\\/]src[\\/]application[\\/]cqrs[\\/]/,
              name: 'cqrs',
              chunks: 'all',
              priority: 8,
            },
            // Domain chunk
            domain: {
              test: /[\\/]src[\\/]domain[\\/]/,
              name: 'domain',
              chunks: 'all',
              priority: 8,
            },
            // Stores chunk
            stores: {
              test: /[\\/]src[\\/]presentation[\\/]stores[\\/]/,
              name: 'stores',
              chunks: 'all',
              priority: 7,
            },
            // UI components chunk
            components: {
              test: /[\\/]src[\\/]presentation[\\/]components[\\/]/,
              name: 'components',
              chunks: 'all',
              priority: 6,
            },
          },
        },
      }
    }

    // Tree shaking optimization (removed usedExports due to conflict with Next.js caching)
    config.optimization.sideEffects = false

    return config
  },

  // Experimental features for better error handling
  experimental: {
    // Enable better error overlay - removed @supabase/supabase-js to avoid conflict with serverExternalPackages
    optimizePackageImports: ['react', 'react-dom'],
    // Enable modern bundling optimizations
    optimizeCss: true,
  },
}

module.exports = nextConfig
