#!/usr/bin/env node

/**
 * Bundle Size Monitoring and Analysis Script
 * Tracks bundle sizes and provides optimization insights
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class BundleMonitor {
  constructor() {
    this.buildDir = path.join(__dirname, '../.next')
    this.reportsDir = path.join(__dirname, '../reports')
    this.baselineFile = path.join(this.reportsDir, 'bundle-baseline.json')
    this.currentReport = null
    
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true })
    }
  }

  async analyze() {
    console.log('📊 Analyzing bundle sizes...\n')
    
    // Check if build exists
    if (!fs.existsSync(this.buildDir)) {
      console.log('❌ No build found. Running production build...')
      await this.runBuild()
    }
    
    const report = await this.generateReport()
    await this.compareWithBaseline(report)
    await this.generateRecommendations(report)
    
    return report
  }

  async runBuild() {
    try {
      console.log('🔨 Building application...')
      execSync('npm run build', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
    } catch (error) {
      console.error('❌ Build failed:', error.message)
      throw error
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      chunks: [],
      pages: [],
      assets: [],
      summary: {}
    }

    // Analyze static chunks
    const staticDir = path.join(this.buildDir, 'static')
    if (fs.existsSync(staticDir)) {
      report.chunks = await this.analyzeChunks(staticDir)
      report.totalSize = report.chunks.reduce((sum, chunk) => sum + chunk.size, 0)
    }

    // Analyze pages
    const pagesManifest = path.join(this.buildDir, 'server/pages-manifest.json')
    if (fs.existsSync(pagesManifest)) {
      const manifest = JSON.parse(fs.readFileSync(pagesManifest, 'utf8'))
      report.pages = await this.analyzePages(manifest)
    }

    // Generate summary
    report.summary = this.generateSummary(report)
    
    this.currentReport = report
    return report
  }

  async analyzeChunks(staticDir) {
    const chunks = []
    const jsDir = path.join(staticDir, 'chunks')
    
    if (!fs.existsSync(jsDir)) return chunks

    const files = fs.readdirSync(jsDir, { recursive: true })
    
    for (const file of files) {
      if (typeof file === 'string' && file.endsWith('.js')) {
        const filePath = path.join(jsDir, file)
        const stats = fs.statSync(filePath)
        const sizeKB = Math.round(stats.size / 1024)
        
        chunks.push({
          name: file,
          path: filePath,
          size: stats.size,
          sizeKB,
          type: this.categorizeChunk(file)
        })
      }
    }
    
    return chunks.sort((a, b) => b.size - a.size)
  }

  categorizeChunk(filename) {
    if (filename.includes('framework')) return 'framework'
    if (filename.includes('vendor') || filename.includes('node_modules')) return 'vendor'
    if (filename.includes('property')) return 'property-features'
    if (filename.includes('ui')) return 'ui-components'
    if (filename.includes('service')) return 'services'
    if (filename.includes('supabase')) return 'database'
    if (filename.includes('analytics')) return 'analytics'
    if (filename.match(/^\d+\./)) return 'page-chunk'
    return 'other'
  }

  async analyzePages(manifest) {
    const pages = []
    
    for (const [route, pageFile] of Object.entries(manifest)) {
      const pagePath = path.join(this.buildDir, 'server', pageFile)
      
      if (fs.existsSync(pagePath)) {
        const stats = fs.statSync(pagePath)
        const sizeKB = Math.round(stats.size / 1024)
        
        pages.push({
          route,
          file: pageFile,
          size: stats.size,
          sizeKB,
          category: this.categorizePage(route)
        })
      }
    }
    
    return pages.sort((a, b) => b.size - a.size)
  }

  categorizePage(route) {
    if (route.includes('/dashboard')) return 'dashboard'
    if (route.includes('/properties')) return 'properties'
    if (route.includes('/tenants')) return 'tenants'
    if (route.includes('/reports')) return 'reports'
    if (route.includes('/admin')) return 'admin'
    if (route === '/') return 'landing'
    return 'other'
  }

  generateSummary(report) {
    const summary = {
      totalSizeKB: Math.round(report.totalSize / 1024),
      totalSizeMB: Math.round(report.totalSize / (1024 * 1024) * 100) / 100,
      chunkCount: report.chunks.length,
      pageCount: report.pages.length,
      largestChunks: report.chunks.slice(0, 5),
      largestPages: report.pages.slice(0, 5),
      byCategory: {}
    }

    // Group by category
    const categories = {}
    report.chunks.forEach(chunk => {
      if (!categories[chunk.type]) categories[chunk.type] = { count: 0, size: 0 }
      categories[chunk.type].count++
      categories[chunk.type].size += chunk.size
    })

    summary.byCategory = Object.entries(categories).map(([type, data]) => ({
      type,
      count: data.count,
      sizeKB: Math.round(data.size / 1024),
      percentage: Math.round((data.size / report.totalSize) * 100)
    })).sort((a, b) => b.sizeKB - a.sizeKB)

    return summary
  }

  async compareWithBaseline(report) {
    console.log('📈 Bundle Size Analysis\n')
    
    // Display current sizes
    console.log(`Total Bundle Size: ${report.summary.totalSizeMB} MB (${report.summary.totalSizeKB} KB)`)
    console.log(`Chunks: ${report.summary.chunkCount}`)
    console.log(`Pages: ${report.summary.pageCount}\n`)

    // Show breakdown by category
    console.log('📦 Size by Category:')
    report.summary.byCategory.forEach(cat => {
      console.log(`  ${cat.type.padEnd(20)} ${cat.sizeKB.toString().padStart(6)} KB (${cat.percentage}%)`)
    })
    console.log('')

    // Show largest chunks
    console.log('🔍 Largest Chunks:')
    report.summary.largestChunks.forEach((chunk, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${chunk.name.padEnd(40)} ${chunk.sizeKB.toString().padStart(6)} KB`)
    })
    console.log('')

    // Compare with baseline if it exists
    if (fs.existsSync(this.baselineFile)) {
      const baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'))
      this.compareReports(baseline, report)
    } else {
      console.log('📝 No baseline found. Saving current report as baseline...')
      fs.writeFileSync(this.baselineFile, JSON.stringify(report, null, 2))
    }

    // Save current report
    const reportFile = path.join(this.reportsDir, `bundle-report-${Date.now()}.json`)
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
  }

  compareReports(baseline, current) {
    console.log('📊 Comparison with Baseline:\n')
    
    const sizeDiff = current.summary.totalSizeKB - baseline.summary.totalSizeKB
    const percentChange = Math.round((sizeDiff / baseline.summary.totalSizeKB) * 100)
    
    if (sizeDiff > 0) {
      console.log(`❌ Bundle size INCREASED by ${sizeDiff} KB (${percentChange}%)`)
    } else if (sizeDiff < 0) {
      console.log(`✅ Bundle size DECREASED by ${Math.abs(sizeDiff)} KB (${Math.abs(percentChange)}%)`)
    } else {
      console.log(`➡️  Bundle size unchanged`)
    }
    
    // Check for new large chunks
    const newLargeChunks = current.chunks.filter(chunk => 
      chunk.sizeKB > 100 && !baseline.chunks.some(b => b.name === chunk.name)
    )
    
    if (newLargeChunks.length > 0) {
      console.log(`\n⚠️  New large chunks detected:`)
      newLargeChunks.forEach(chunk => {
        console.log(`   ${chunk.name}: ${chunk.sizeKB} KB`)
      })
    }
    
    console.log('')
  }

  async generateRecommendations(report) {
    console.log('💡 Optimization Recommendations:\n')
    
    const recommendations = []
    
    // Check for oversized chunks
    const largeChunks = report.chunks.filter(chunk => chunk.sizeKB > 200)
    if (largeChunks.length > 0) {
      recommendations.push({
        priority: 'high',
        issue: `${largeChunks.length} chunks over 200KB`,
        action: 'Consider code splitting or lazy loading for large chunks',
        chunks: largeChunks.map(c => `${c.name} (${c.sizeKB}KB)`)
      })
    }
    
    // Check vendor bundle size
    const vendorSize = report.summary.byCategory.find(c => c.type === 'vendor')?.sizeKB || 0
    if (vendorSize > 500) {
      recommendations.push({
        priority: 'medium',
        issue: `Vendor bundle is ${vendorSize}KB`,
        action: 'Review third-party dependencies and consider alternatives'
      })
    }
    
    // Check for duplicate functionality
    const frameworkSize = report.summary.byCategory.find(c => c.type === 'framework')?.sizeKB || 0
    if (frameworkSize > 300) {
      recommendations.push({
        priority: 'low',
        issue: `Framework bundle is ${frameworkSize}KB`,
        action: 'Ensure React and Next.js are properly deduplicated'
      })
    }
    
    // Display recommendations
    const priorityOrder = ['high', 'medium', 'low']
    for (const priority of priorityOrder) {
      const priorityRecs = recommendations.filter(r => r.priority === priority)
      if (priorityRecs.length === 0) continue
      
      console.log(`🚨 ${priority.toUpperCase()} PRIORITY:`)
      priorityRecs.forEach(rec => {
        console.log(`   Issue: ${rec.issue}`)
        console.log(`   Action: ${rec.action}`)
        if (rec.chunks) {
          console.log(`   Affected: ${rec.chunks.slice(0, 3).join(', ')}`)
        }
        console.log('')
      })
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No major optimization opportunities detected!')
    }
    
    console.log('🎯 Next Steps:')
    console.log('1. Run "npm run analyze" for detailed bundle visualization')
    console.log('2. Use "npm run optimize-imports" to check for tree shaking opportunities')
    console.log('3. Consider implementing lazy loading for admin features')
    console.log('4. Monitor bundle size in CI/CD pipeline\n')
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new BundleMonitor()
  monitor.analyze().catch(error => {
    console.error('Error during bundle analysis:', error)
    process.exit(1)
  })
}

module.exports = BundleMonitor
