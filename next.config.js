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
    // Strip console logs in production
    if (!dev && !isServer) {
      config.optimization.minimizer = config.optimization.minimizer || []
      const TerserPlugin = require('terser-webpack-plugin')

      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.log statements
              drop_debugger: true, // Remove debugger statements
            },
          },
        })
      )
    }

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

    // Advanced chunk optimization
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Framework chunk (React, Next.js)
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
              name: 'framework',
              chunks: 'all',
              priority: 40,
              enforce: true,
            },
            // Large vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              minChunks: 1,
              maxSize: 200000,
            },
            // Property management components
            propertyComponents: {
              test: /[\\/]src[\\/]components[\\/]properties[\\/]/,
              name: 'property-components',
              chunks: 'all',
              priority: 30,
              minChunks: 1,
            },
            // UI components
            uiComponents: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              chunks: 'all',
              priority: 25,
              minChunks: 2,
            },
            // Services and utilities
            services: {
              test: /[\\/]src[\\/](services|lib|utils)[\\/]/,
              name: 'services',
              chunks: 'all',
              priority: 20,
              minChunks: 2,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
              maxSize: 100000,
            },
            // Default chunk
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
        // Module concatenation for better tree shaking
        concatenateModules: true,
        // Minimize duplicate code
        mergeDuplicateChunks: true,
        // Remove empty chunks
        removeEmptyChunks: true,
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
