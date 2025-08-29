#!/usr/bin/env node

/**
 * Performance Optimization Script
 * Removes debug logging, optimizes imports, and cleans up performance bottlenecks
 */

const fs = require('fs')
const path = require('path')

const COMPONENTS_DIR = path.join(__dirname, '../src/components')
const HOOKS_DIR = path.join(__dirname, '../src/hooks')

// Patterns to remove for performance
const PERFORMANCE_PATTERNS = [
  // Console logging patterns
  /console\.(log|error|warn|info|debug)\([^)]*\);?\s*\n/g,
  /\/\/ eslint-disable-next-line no-console\s*\n/g,
  
  // Debug comments and blocks
  /\/\/ Debug[^\n]*\n/g,
  /\/\* Debug[^*]*\*\/\s*\n/g,
  
  // Test/fallback patterns
  /\/\/ .*test.*\n/gi,
  /\/\/ .*fallback.*\n/gi,
  
  // Empty useEffect cleanup
  /useEffect\(\(\) => \{\s*\n\s*\}, \[\]\)/g,
  
  // Excessive whitespace
  /\n\s*\n\s*\n/g,
]

// Files to optimize
const TARGET_FILES = [
  'components/properties/components/FinancialStatusIndicator.tsx',
  'components/properties/components/PurchasePipelineDocuments.tsx',
  'components/properties/components/PropertyAcquisitionFinancials.tsx',
  'components/properties/components/InlinePropertyView.tsx',
]

function optimizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let originalSize = content.length
    
    // Apply performance patterns
    PERFORMANCE_PATTERNS.forEach(pattern => {
      content = content.replace(pattern, match => {
        // Keep single newlines, remove excessive ones
        if (pattern.source.includes('\\n\\s*\\n\\s*\\n')) {
          return '\n\n'
        }
        return ''
      })
    })
    
    // Remove specific debug blocks
    content = content.replace(
      /if \(process\.env\.NODE_ENV === 'development'\) \{[^}]*console\.[^}]*\}/gs,
      ''
    )
    
    // Clean up empty lines
    content = content.replace(/\n{3,}/g, '\n\n')
    
    let newSize = content.length
    let savings = originalSize - newSize
    
    if (savings > 0) {
      fs.writeFileSync(filePath, content)
      console.log(`✅ Optimized ${path.basename(filePath)}: ${savings} bytes saved`)
    } else {
      console.log(`ℹ️  ${path.basename(filePath)}: No optimization needed`)
    }
    
    return savings
  } catch (error) {
    console.error(`❌ Error optimizing ${filePath}:`, error.message)
    return 0
  }
}

function optimizeDirectory(dir) {
  let totalSavings = 0
  
  try {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name)
      
      if (file.isDirectory()) {
        totalSavings += optimizeDirectory(fullPath)
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        totalSavings += optimizeFile(fullPath)
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dir}:`, error.message)
  }
  
  return totalSavings
}

function main() {
  console.log('🚀 Starting Performance Optimization...\n')
  
  let totalSavings = 0
  
  // Optimize specific target files first
  TARGET_FILES.forEach(relativePath => {
    const fullPath = path.join(__dirname, '../src', relativePath)
    if (fs.existsSync(fullPath)) {
      totalSavings += optimizeFile(fullPath)
    }
  })
  
  // Optimize all components and hooks
  totalSavings += optimizeDirectory(COMPONENTS_DIR)
  totalSavings += optimizeDirectory(HOOKS_DIR)
  
  console.log(`\n✨ Performance optimization complete!`)
  console.log(`📊 Total bytes saved: ${totalSavings}`)
  console.log(`📈 Estimated load time improvement: ${Math.round(totalSavings / 1024)}ms`)
}

if (require.main === module) {
  main()
}

module.exports = { optimizeFile, optimizeDirectory }
