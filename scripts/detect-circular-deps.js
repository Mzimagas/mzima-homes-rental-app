#!/usr/bin/env node

/**
 * Circular Dependency Detection Script
 * 
 * This script analyzes the codebase to find circular dependencies
 * that can cause bundle issues and runtime errors.
 */

const fs = require('fs')
const path = require('path')

class CircularDependencyDetector {
  constructor(srcDir) {
    this.srcDir = srcDir
    this.dependencyGraph = new Map()
    this.fileExtensions = ['.ts', '.tsx', '.js', '.jsx']
  }

  // Build dependency graph from import statements
  buildDependencyGraph() {
    console.log('🔍 Building dependency graph...')
    this.scanDirectory(this.srcDir)
    console.log(`📊 Found ${this.dependencyGraph.size} files with dependencies`)
  }

  scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const fullPath = path.join(dir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.next', 'dist', 'build'].includes(item)) {
            this.scanDirectory(fullPath)
          }
        } else if (this.shouldAnalyzeFile(fullPath)) {
          this.analyzeFile(fullPath)
        }
      }
    } catch (error) {
      console.error(`Error scanning ${dir}:`, error.message)
    }
  }

  shouldAnalyzeFile(filePath) {
    return this.fileExtensions.some(ext => filePath.endsWith(ext))
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(this.srcDir, filePath)
      const dependencies = this.extractDependencies(content, filePath)
      
      if (dependencies.length > 0) {
        this.dependencyGraph.set(relativePath, dependencies)
      }
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message)
    }
  }

  extractDependencies(content, filePath) {
    const dependencies = []
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g
    let match

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      
      // Only analyze relative imports (potential circular dependencies)
      if (importPath.startsWith('.')) {
        const resolvedPath = this.resolveImportPath(importPath, filePath)
        if (resolvedPath) {
          dependencies.push(resolvedPath)
        }
      }
    }

    return dependencies
  }

  resolveImportPath(importPath, fromFile) {
    try {
      const fromDir = path.dirname(fromFile)
      let resolvedPath = path.resolve(fromDir, importPath)
      
      // Try different extensions if no extension provided
      if (!path.extname(resolvedPath)) {
        for (const ext of this.fileExtensions) {
          const withExt = resolvedPath + ext
          if (fs.existsSync(withExt)) {
            resolvedPath = withExt
            break
          }
        }
        
        // Try index files
        if (!fs.existsSync(resolvedPath)) {
          for (const ext of this.fileExtensions) {
            const indexPath = path.join(resolvedPath, `index${ext}`)
            if (fs.existsSync(indexPath)) {
              resolvedPath = indexPath
              break
            }
          }
        }
      }
      
      if (fs.existsSync(resolvedPath)) {
        return path.relative(this.srcDir, resolvedPath)
      }
    } catch (error) {
      // Ignore resolution errors
    }
    
    return null
  }

  // Detect circular dependencies using DFS
  detectCircularDependencies() {
    console.log('\n🔄 Detecting circular dependencies...')
    
    const visited = new Set()
    const recursionStack = new Set()
    const cycles = []

    const dfs = (file, path = []) => {
      if (recursionStack.has(file)) {
        // Found a cycle
        const cycleStart = path.indexOf(file)
        const cycle = path.slice(cycleStart).concat([file])
        cycles.push(cycle)
        return true
      }

      if (visited.has(file)) {
        return false
      }

      visited.add(file)
      recursionStack.add(file)
      path.push(file)

      const dependencies = this.dependencyGraph.get(file) || []
      for (const dep of dependencies) {
        if (dfs(dep, [...path])) {
          // Continue to find all cycles
        }
      }

      recursionStack.delete(file)
      return false
    }

    // Check all files
    for (const file of this.dependencyGraph.keys()) {
      if (!visited.has(file)) {
        dfs(file)
      }
    }

    return cycles
  }

  // Find potential circular dependency risks
  findRiskyDependencies() {
    console.log('\n⚠️  Finding risky dependency patterns...')
    
    const risks = []
    
    for (const [file, dependencies] of this.dependencyGraph.entries()) {
      // Check for bidirectional dependencies
      for (const dep of dependencies) {
        const depDependencies = this.dependencyGraph.get(dep) || []
        if (depDependencies.includes(file)) {
          risks.push({
            type: 'bidirectional',
            files: [file, dep],
            description: 'Two files import each other directly'
          })
        }
      }
      
      // Check for high coupling (too many dependencies)
      if (dependencies.length > 10) {
        risks.push({
          type: 'high_coupling',
          files: [file],
          dependencies: dependencies.length,
          description: `File has ${dependencies.length} dependencies (high coupling)`
        })
      }
    }
    
    return risks
  }

  // Generate report
  generateReport(cycles, risks) {
    console.log('\n📋 CIRCULAR DEPENDENCY ANALYSIS REPORT')
    console.log('=====================================')
    
    if (cycles.length === 0) {
      console.log('✅ No circular dependencies found!')
    } else {
      console.log(`🚨 Found ${cycles.length} circular dependencies:`)
      cycles.forEach((cycle, index) => {
        console.log(`\n${index + 1}. Circular dependency:`)
        cycle.forEach((file, i) => {
          const arrow = i < cycle.length - 1 ? ' → ' : ''
          console.log(`   ${file}${arrow}`)
        })
      })
    }
    
    if (risks.length > 0) {
      console.log(`\n⚠️  Found ${risks.length} risky dependency patterns:`)
      risks.forEach((risk, index) => {
        console.log(`\n${index + 1}. ${risk.type.toUpperCase()}:`)
        console.log(`   ${risk.description}`)
        risk.files.forEach(file => {
          console.log(`   - ${file}`)
        })
      })
    }
    
    // Suggestions
    console.log('\n💡 RECOMMENDATIONS:')
    if (cycles.length > 0) {
      console.log('   • Break circular dependencies by:')
      console.log('     - Moving shared code to a common module')
      console.log('     - Using dependency injection')
      console.log('     - Implementing the Observer pattern')
      console.log('     - Creating interface abstractions')
    }
    
    if (risks.some(r => r.type === 'high_coupling')) {
      console.log('   • Reduce high coupling by:')
      console.log('     - Splitting large files into smaller modules')
      console.log('     - Using composition over inheritance')
      console.log('     - Implementing facade patterns')
    }
    
    if (risks.some(r => r.type === 'bidirectional')) {
      console.log('   • Fix bidirectional dependencies by:')
      console.log('     - Creating a shared utilities module')
      console.log('     - Using event-driven communication')
      console.log('     - Implementing dependency inversion')
    }
  }

  // Main analysis method
  analyze() {
    console.log('🔍 Starting circular dependency analysis...')
    
    this.buildDependencyGraph()
    const cycles = this.detectCircularDependencies()
    const risks = this.findRiskyDependencies()
    
    this.generateReport(cycles, risks)
    
    return {
      cycles,
      risks,
      totalFiles: this.dependencyGraph.size
    }
  }
}

// Run the analysis
function main() {
  const srcDir = path.join(__dirname, '../src')
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory not found:', srcDir)
    process.exit(1)
  }
  
  const detector = new CircularDependencyDetector(srcDir)
  const results = detector.analyze()
  
  // Exit with error code if circular dependencies found
  if (results.cycles.length > 0) {
    console.log('\n❌ Circular dependencies detected!')
    process.exit(1)
  } else {
    console.log('\n✅ No circular dependencies found!')
    process.exit(0)
  }
}

// Export for testing
module.exports = { CircularDependencyDetector }

// Run if called directly
if (require.main === module) {
  main()
}
