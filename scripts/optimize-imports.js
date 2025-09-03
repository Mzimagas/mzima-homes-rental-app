#!/usr/bin/env node

/**
 * Tree Shaking Optimization Script
 * Analyzes and optimizes imports for better bundle size
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class ImportOptimizer {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.issues = []
    this.optimizations = []
    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      optimizationsApplied: 0
    }
  }

  async analyze() {
    console.log('🔍 Analyzing imports for tree shaking optimization...\n')
    
    await this.scanDirectory(this.srcDir)
    this.generateReport()
    
    return {
      issues: this.issues,
      optimizations: this.optimizations,
      stats: this.stats
    }
  }

  async scanDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name)
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        await this.scanDirectory(fullPath)
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        await this.analyzeFile(fullPath)
      }
    }
  }

  async analyzeFile(filePath) {
    this.stats.filesScanned++
    
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(this.srcDir, filePath)
      
      // Check for problematic import patterns
      this.checkWildcardImports(content, relativePath)
      this.checkLodashImports(content, relativePath)
      this.checkHeroIconsImports(content, relativePath)
      this.checkUnusedImports(content, relativePath)
      this.checkLargeLibraryImports(content, relativePath)
      
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message)
    }
  }

  checkWildcardImports(content, filePath) {
    const wildcardPattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = wildcardPattern.exec(content)) !== null) {
      const [fullMatch, alias, module] = match
      
      this.issues.push({
        type: 'wildcard-import',
        file: filePath,
        line: this.getLineNumber(content, match.index),
        issue: `Wildcard import: ${fullMatch}`,
        suggestion: `Import specific exports instead of using wildcard import`,
        severity: 'high',
        module
      })
      this.stats.issuesFound++
    }
  }

  checkLodashImports(content, filePath) {
    // Check for full lodash imports
    const lodashFullImport = /import\s+.*\s+from\s+['"]lodash['"]/g
    let match
    
    while ((match = lodashFullImport.exec(content)) !== null) {
      this.issues.push({
        type: 'lodash-full-import',
        file: filePath,
        line: this.getLineNumber(content, match.index),
        issue: `Full lodash import: ${match[0]}`,
        suggestion: `Use specific lodash imports like 'lodash/debounce' or 'lodash-es'`,
        severity: 'high',
        module: 'lodash'
      })
      this.stats.issuesFound++
    }
  }

  checkHeroIconsImports(content, filePath) {
    // Check for inefficient heroicons imports
    const heroIconsPattern = /import\s+\{([^}]+)\}\s+from\s+['"]@heroicons\/react\/24\/(outline|solid)['"]/g
    let match
    
    while ((match = heroIconsPattern.exec(content)) !== null) {
      const [fullMatch, imports, variant] = match
      const importList = imports.split(',').map(i => i.trim())
      
      if (importList.length > 10) {
        this.issues.push({
          type: 'large-heroicons-import',
          file: filePath,
          line: this.getLineNumber(content, match.index),
          issue: `Large heroicons import with ${importList.length} icons`,
          suggestion: `Consider using dynamic imports for rarely used icons`,
          severity: 'medium',
          module: '@heroicons/react'
        })
        this.stats.issuesFound++
      }
    }
  }

  checkUnusedImports(content, filePath) {
    // Simple check for potentially unused imports
    const importPattern = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
    let match
    
    while ((match = importPattern.exec(content)) !== null) {
      const [fullMatch, imports, module] = match
      const importList = imports.split(',').map(i => i.trim().replace(/\s+as\s+\w+/, ''))
      
      for (const importName of importList) {
        const cleanImportName = importName.trim()
        if (cleanImportName && !this.isImportUsed(content, cleanImportName, match.index)) {
          this.issues.push({
            type: 'unused-import',
            file: filePath,
            line: this.getLineNumber(content, match.index),
            issue: `Potentially unused import: ${cleanImportName}`,
            suggestion: `Remove unused import to reduce bundle size`,
            severity: 'low',
            module
          })
          this.stats.issuesFound++
        }
      }
    }
  }

  checkLargeLibraryImports(content, filePath) {
    const largeLibraries = [
      { name: 'react-window', suggestion: 'Use dynamic import for virtualization' },
      { name: 'jspdf', suggestion: 'Use dynamic import for PDF generation' },
      { name: 'xlsx', suggestion: 'Use dynamic import for Excel functionality' },
      { name: 'posthog-js', suggestion: 'Load analytics asynchronously' }
    ]
    
    for (const lib of largeLibraries) {
      const pattern = new RegExp(`import\\s+.*\\s+from\\s+['"]${lib.name}['"]`, 'g')
      let match
      
      while ((match = pattern.exec(content)) !== null) {
        this.issues.push({
          type: 'large-library-import',
          file: filePath,
          line: this.getLineNumber(content, match.index),
          issue: `Direct import of large library: ${lib.name}`,
          suggestion: lib.suggestion,
          severity: 'medium',
          module: lib.name
        })
        this.stats.issuesFound++
      }
    }
  }

  isImportUsed(content, importName, importIndex) {
    // Simple heuristic: check if import name appears after the import statement
    const afterImport = content.substring(importIndex + 100) // Skip the import line
    const usagePattern = new RegExp(`\\b${importName}\\b`, 'g')
    return usagePattern.test(afterImport)
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length
  }

  generateReport() {
    console.log('📊 Tree Shaking Analysis Report\n')
    console.log(`Files scanned: ${this.stats.filesScanned}`)
    console.log(`Issues found: ${this.stats.issuesFound}\n`)
    
    // Group issues by type
    const issuesByType = this.issues.reduce((acc, issue) => {
      if (!acc[issue.type]) acc[issue.type] = []
      acc[issue.type].push(issue)
      return acc
    }, {})
    
    // Report by severity
    const severityOrder = ['high', 'medium', 'low']
    
    for (const severity of severityOrder) {
      const severityIssues = this.issues.filter(i => i.severity === severity)
      if (severityIssues.length === 0) continue
      
      console.log(`\n🚨 ${severity.toUpperCase()} PRIORITY (${severityIssues.length} issues):`)
      
      for (const issue of severityIssues.slice(0, 10)) { // Show top 10
        console.log(`  📁 ${issue.file}:${issue.line}`)
        console.log(`     Issue: ${issue.issue}`)
        console.log(`     Fix: ${issue.suggestion}\n`)
      }
      
      if (severityIssues.length > 10) {
        console.log(`     ... and ${severityIssues.length - 10} more ${severity} priority issues\n`)
      }
    }
    
    this.generateOptimizationSuggestions()
  }

  generateOptimizationSuggestions() {
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:\n')
    
    const moduleIssues = this.issues.reduce((acc, issue) => {
      if (!acc[issue.module]) acc[issue.module] = []
      acc[issue.module].push(issue)
      return acc
    }, {})
    
    for (const [module, issues] of Object.entries(moduleIssues)) {
      if (issues.length > 2) {
        console.log(`📦 ${module} (${issues.length} issues):`)
        
        if (module === 'lodash') {
          console.log('   → Replace with lodash-es or specific imports')
          console.log('   → Example: import debounce from "lodash-es/debounce"')
        } else if (module === '@heroicons/react') {
          console.log('   → Use the OptimizedIcons component for frequently used icons')
          console.log('   → Lazy load rarely used icons')
        } else if (module.includes('supabase')) {
          console.log('   → Already optimized with server external packages')
        } else {
          console.log('   → Consider dynamic imports for this library')
        }
        console.log('')
      }
    }
    
    console.log('🎯 NEXT STEPS:')
    console.log('1. Run "npm run build" to see current bundle sizes')
    console.log('2. Run "npm run analyze" to visualize bundle composition')
    console.log('3. Apply the suggested optimizations above')
    console.log('4. Re-run this script to verify improvements\n')
  }
}

// CLI execution
if (require.main === module) {
  const optimizer = new ImportOptimizer()
  optimizer.analyze().then(results => {
    process.exit(results.stats.issuesFound > 0 ? 1 : 0)
  }).catch(error => {
    console.error('Error during analysis:', error)
    process.exit(1)
  })
}

module.exports = ImportOptimizer
