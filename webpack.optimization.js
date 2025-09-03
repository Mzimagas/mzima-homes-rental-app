/**
 * Advanced Webpack Optimization Configuration
 * Enhances tree shaking and bundle optimization
 */

const path = require('path')

module.exports = {
  /**
   * Enhanced tree shaking configuration
   */
  configureTreeShaking: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Enable aggressive tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Configure module concatenation for better tree shaking
      config.optimization.concatenateModules = true
      
      // Add specific sideEffects configuration for known libraries
      config.module.rules.push({
        test: /\.js$/,
        include: /node_modules\/(lodash|@heroicons|@headlessui)/,
        sideEffects: false
      })
      
      // Configure resolve for better tree shaking
      config.resolve.mainFields = ['es2015', 'module', 'main']
      
      // Add alias for tree-shakable versions
      config.resolve.alias = {
        ...config.resolve.alias,
        'lodash': 'lodash-es',
        '@heroicons/react/24/outline': '@heroicons/react/24/outline/esm',
        '@heroicons/react/24/solid': '@heroicons/react/24/solid/esm'
      }
    }
    
    return config
  },

  /**
   * Advanced chunk splitting strategy
   */
  configureChunkSplitting: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        maxAsyncRequests: 30,
        maxInitialRequests: 25,
        cacheGroups: {
          // Critical framework chunk
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 50,
            enforce: true,
            reuseExistingChunk: true,
          },
          
          // Supabase and auth
          supabase: {
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            name: 'supabase',
            chunks: 'all',
            priority: 45,
            enforce: true,
            reuseExistingChunk: true,
          },
          
          // UI libraries
          uiLibraries: {
            test: /[\\/]node_modules[\\/](@headlessui|@heroicons|@radix-ui|lucide-react)[\\/]/,
            name: 'ui-libraries',
            chunks: 'all',
            priority: 40,
            enforce: true,
            reuseExistingChunk: true,
          },
          
          // Form libraries
          forms: {
            test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
            name: 'forms',
            chunks: 'all',
            priority: 35,
            reuseExistingChunk: true,
          },
          
          // Analytics and monitoring
          analytics: {
            test: /[\\/]node_modules[\\/](posthog-js|@upstash)[\\/]/,
            name: 'analytics',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          
          // Heavy utilities
          utilities: {
            test: /[\\/]node_modules[\\/](lodash|date-fns|moment)[\\/]/,
            name: 'utilities',
            chunks: 'all',
            priority: 28,
            reuseExistingChunk: true,
          },
          
          // PDF and Excel libraries
          documents: {
            test: /[\\/]node_modules[\\/](jspdf|xlsx|file-saver)[\\/]/,
            name: 'documents',
            chunks: 'async', // Only load when needed
            priority: 25,
            reuseExistingChunk: true,
          },
          
          // Admin features (separate bundle)
          adminFeatures: {
            test: /[\\/]src[\\/]components[\\/](administration|properties[\\/]permission-management)[\\/]/,
            name: 'admin-features',
            chunks: 'async',
            priority: 23,
            minChunks: 1,
          },
          
          // Property management core
          propertyCore: {
            test: /[\\/]src[\\/]components[\\/]properties[\\/]/,
            name: 'property-core',
            chunks: 'all',
            priority: 20,
            minChunks: 1,
          },
          
          // Reports and analytics
          reports: {
            test: /[\\/]src[\\/]components[\\/]reports[\\/]/,
            name: 'reports',
            chunks: 'async',
            priority: 18,
            minChunks: 1,
          },
          
          // UI components
          uiComponents: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 15,
            minChunks: 2,
          },
          
          // Services and utilities
          services: {
            test: /[\\/]src[\\/](services|lib|utils)[\\/]/,
            name: 'services',
            chunks: 'all',
            priority: 12,
            minChunks: 2,
          },
          
          // Vendor libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            minChunks: 1,
            maxSize: 200000,
            reuseExistingChunk: true,
          },
          
          // Common shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            maxSize: 100000,
          },
          
          // Default
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      }
    }
    
    return config
  },

  /**
   * Configure module resolution for better tree shaking
   */
  configureModuleResolution: (config) => {
    // Prefer ES modules for better tree shaking
    config.resolve.mainFields = ['es2015', 'module', 'main']
    
    // Add extensions for better resolution
    config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
    
    // Configure module directories
    config.resolve.modules = ['node_modules', path.resolve(__dirname, 'src')]
    
    return config
  },

  /**
   * Configure optimization plugins
   */
  configureOptimizationPlugins: (config, { webpack, dev, isServer }) => {
    if (!dev && !isServer) {
      // Add module concatenation plugin
      config.plugins.push(
        new webpack.optimize.ModuleConcatenationPlugin()
      )
      
      // Add provide plugin for commonly used utilities
      config.plugins.push(
        new webpack.ProvidePlugin({
          // Automatically import React in JSX files
          React: 'react',
        })
      )
      
      // Configure DefinePlugin for better dead code elimination
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
          __DEV__: false,
          __PROD__: true,
        })
      )
    }
    
    return config
  },

  /**
   * Configure loader optimizations
   */
  configureLoaders: (config, { dev }) => {
    // Optimize TypeScript compilation
    const tsRule = config.module.rules.find(rule => 
      rule.test && rule.test.toString().includes('tsx?')
    )
    
    if (tsRule && tsRule.use) {
      const tsLoader = Array.isArray(tsRule.use) 
        ? tsRule.use.find(loader => loader.loader && loader.loader.includes('next-swc-loader'))
        : tsRule.use
      
      if (tsLoader && tsLoader.options) {
        tsLoader.options = {
          ...tsLoader.options,
          // Enable SWC optimizations
          jsc: {
            ...tsLoader.options.jsc,
            minify: {
              compress: !dev,
              mangle: !dev,
            },
          },
        }
      }
    }
    
    return config
  },

  /**
   * Apply all optimizations
   */
  applyOptimizations: (config, context) => {
    config = module.exports.configureTreeShaking(config, context)
    config = module.exports.configureChunkSplitting(config, context)
    config = module.exports.configureModuleResolution(config)
    config = module.exports.configureOptimizationPlugins(config, context)
    config = module.exports.configureLoaders(config, context)
    
    return config
  }
}
