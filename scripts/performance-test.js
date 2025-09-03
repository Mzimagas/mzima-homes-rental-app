/**
 * Property Management Workflow Performance Testing Script
 * Measures loading times and identifies bottlenecks across workflow tabs
 */

const puppeteer = require('puppeteer')
const fs = require('fs')
const path = require('path')

class WorkflowPerformanceTester {
  constructor() {
    this.browser = null
    this.page = null
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {},
    }
  }

  async initialize() {
    console.log('🚀 Initializing Performance Tester...')

    this.browser = await puppeteer.launch({
      headless: false, // Set to true for CI/automated testing
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    })

    this.page = await this.browser.newPage()

    // Set viewport for consistent testing
    await this.page.setViewport({ width: 1920, height: 1080 })

    // Enable performance monitoring
    await this.page.setCacheEnabled(false) // Test cold loads

    // Listen for console logs to capture loading events
    this.page.on('console', (msg) => {
      if (msg.text().includes('[Performance]')) {
        console.log('📊', msg.text())
      }
    })

    console.log('✅ Performance Tester initialized')
  }

  async measurePageLoad(url, testName) {
    console.log(`\n🔍 Testing: ${testName}`)
    console.log(`📍 URL: ${url}`)

    const startTime = Date.now()

    // Start performance measurement
    await this.page.evaluateOnNewDocument(() => {
      window.performanceMarks = []
      window.markPerformance = (name) => {
        const mark = { name, timestamp: performance.now() }
        window.performanceMarks.push(mark)
        console.log(`[Performance] ${name}: ${mark.timestamp}ms`)
      }
    })

    // Navigate to page
    const response = await this.page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    })

    const navigationTime = Date.now() - startTime

    // Wait for React to hydrate
    await this.page.waitForSelector(
      '[data-testid="workflow-navigation"], .workflow-navigation, h2:contains("Property Management Workflows")',
      {
        timeout: 10000,
      }
    )

    // Measure time to interactive
    const timeToInteractive = await this.page.evaluate(() => {
      return performance.now()
    })

    // Get performance marks from the page
    const performanceMarks = await this.page.evaluate(() => {
      return window.performanceMarks || []
    })

    const result = {
      testName,
      url,
      navigationTime,
      timeToInteractive,
      performanceMarks,
      timestamp: new Date().toISOString(),
    }

    console.log(`⏱️  Navigation: ${navigationTime}ms`)
    console.log(`⚡ Time to Interactive: ${timeToInteractive}ms`)

    return result
  }

  async measureTabSwitch(tabName, tabSelector) {
    console.log(`\n🔄 Testing tab switch: ${tabName}`)

    const startTime = performance.now()

    // Click the tab
    await this.page.click(tabSelector)

    // Wait for tab content to load
    const tabContentSelector = this.getTabContentSelector(tabName)
    await this.page.waitForSelector(tabContentSelector, { timeout: 15000 })

    // Wait for loading states to complete
    await this.page.waitForFunction(
      () => {
        const loadingElements = document.querySelectorAll('.animate-spin, .animate-pulse')
        return loadingElements.length === 0
      },
      { timeout: 20000 }
    )

    const switchTime = performance.now() - startTime

    // Check for staggered loading
    const staggeredElements = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button')
      const forms = document.querySelectorAll('form')
      const cards = document.querySelectorAll('.card, [class*="card"]')

      return {
        buttonCount: buttons.length,
        formCount: forms.length,
        cardCount: cards.length,
        hasSkeletonLoaders: document.querySelectorAll('.animate-pulse').length > 0,
      }
    })

    const result = {
      tabName,
      switchTime,
      staggeredElements,
      timestamp: new Date().toISOString(),
    }

    console.log(`⏱️  Tab Switch Time: ${switchTime}ms`)
    console.log(`🎯 Elements: ${JSON.stringify(staggeredElements)}`)

    return result
  }

  getTabContentSelector(tabName) {
    const selectors = {
      properties:
        '[data-testid="properties-tab"], .properties-tab, h3:contains("Properties Repository")',
      purchase:
        '[data-testid="purchase-tab"], .purchase-pipeline, h3:contains("Purchase Pipeline")',
      subdivision:
        '[data-testid="subdivision-tab"], .subdivision-pipeline, h3:contains("Subdivision Pipeline")',
      handover:
        '[data-testid="handover-tab"], .handover-pipeline, h3:contains("Handover Pipeline")',
    }
    return selectors[tabName] || `[data-testid="${tabName}-tab"]`
  }

  async runFullWorkflowTest() {
    console.log('\n🎯 Running Full Workflow Performance Test')

    const baseUrl = 'http://localhost:3001'

    try {
      // Test 1: Initial page load
      const initialLoad = await this.measurePageLoad(
        `${baseUrl}/dashboard/properties`,
        'Initial Properties Page Load'
      )
      this.results.tests.push(initialLoad)

      // Test 2: Tab switching performance
      const tabs = [
        {
          name: 'purchase',
          selector: 'button:contains("Purchase Pipeline"), [data-tab="purchase"]',
        },
        {
          name: 'subdivision',
          selector: 'button:contains("Subdivision"), [data-tab="subdivision"]',
        },
        { name: 'handover', selector: 'button:contains("Handover"), [data-tab="handover"]' },
        { name: 'properties', selector: 'button:contains("Properties"), [data-tab="properties"]' },
      ]

      for (const tab of tabs) {
        try {
          const tabResult = await this.measureTabSwitch(tab.name, tab.selector)
          this.results.tests.push(tabResult)

          // Wait between tab switches
          await this.page.waitForTimeout(1000)
        } catch (error) {
          console.error(`❌ Failed to test ${tab.name} tab:`, error.message)
        }
      }

      // Test 3: Warm cache performance (reload and test again)
      console.log('\n🔥 Testing warm cache performance...')
      await this.page.reload({ waitUntil: 'networkidle0' })

      const warmLoad = await this.measurePageLoad(
        `${baseUrl}/dashboard/properties`,
        'Warm Cache Properties Page Load'
      )
      this.results.tests.push(warmLoad)
    } catch (error) {
      console.error('❌ Test failed:', error)
    }
  }

  generateReport() {
    console.log('\n📊 Generating Performance Report...')

    // Calculate summary statistics
    const loadTimes = this.results.tests
      .filter((test) => test.navigationTime)
      .map((test) => test.navigationTime)

    const tabSwitchTimes = this.results.tests
      .filter((test) => test.switchTime)
      .map((test) => test.switchTime)

    this.results.summary = {
      totalTests: this.results.tests.length,
      averageLoadTime:
        loadTimes.length > 0
          ? Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length)
          : 0,
      averageTabSwitchTime:
        tabSwitchTimes.length > 0
          ? Math.round(tabSwitchTimes.reduce((a, b) => a + b, 0) / tabSwitchTimes.length)
          : 0,
      maxLoadTime: Math.max(...loadTimes, 0),
      maxTabSwitchTime: Math.max(...tabSwitchTimes, 0),
      recommendations: this.generateRecommendations(),
    }

    // Save detailed results
    const reportPath = path.join(__dirname, '../performance-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))

    // Print summary
    console.log('\n📈 PERFORMANCE SUMMARY')
    console.log('='.repeat(50))
    console.log(`📊 Total Tests: ${this.results.summary.totalTests}`)
    console.log(`⏱️  Average Load Time: ${this.results.summary.averageLoadTime}ms`)
    console.log(`🔄 Average Tab Switch: ${this.results.summary.averageTabSwitchTime}ms`)
    console.log(`🐌 Slowest Load: ${this.results.summary.maxLoadTime}ms`)
    console.log(`🐌 Slowest Tab Switch: ${this.results.summary.maxTabSwitchTime}ms`)

    console.log('\n💡 RECOMMENDATIONS:')
    this.results.summary.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })

    console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  }

  generateRecommendations() {
    const recommendations = []
    const { averageLoadTime, averageTabSwitchTime, maxLoadTime, maxTabSwitchTime } =
      this.results.summary

    if (averageLoadTime > 3000) {
      recommendations.push(
        'Initial load time is slow (>3s). Consider implementing skeleton loading states.'
      )
    }

    if (averageTabSwitchTime > 1000) {
      recommendations.push('Tab switching is slow (>1s). Implement prefetching and lazy loading.')
    }

    if (maxLoadTime > 5000) {
      recommendations.push(
        'Some loads are very slow (>5s). Optimize data fetching and bundle size.'
      )
    }

    if (maxTabSwitchTime > 2000) {
      recommendations.push(
        'Some tab switches are very slow (>2s). Add progressive loading and caching.'
      )
    }

    // Check for missing optimizations
    const hasSkeletonLoaders = this.results.tests.some(
      (test) => test.staggeredElements?.hasSkeletonLoaders
    )

    if (!hasSkeletonLoaders) {
      recommendations.push(
        'No skeleton loaders detected. Add skeleton states for better perceived performance.'
      )
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance looks good! Consider monitoring in production.')
    }

    return recommendations
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
    console.log('🧹 Cleanup completed')
  }
}

// Run the performance test
async function runPerformanceTest() {
  const tester = new WorkflowPerformanceTester()

  try {
    await tester.initialize()
    await tester.runFullWorkflowTest()
    tester.generateReport()
  } catch (error) {
    console.error('❌ Performance test failed:', error)
  } finally {
    await tester.cleanup()
  }
}

// Export for use in other scripts
module.exports = { WorkflowPerformanceTester }

// Run if called directly
if (require.main === module) {
  runPerformanceTest()
}
