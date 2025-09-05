/**
 * User Acceptance Tests for Property Management Dashboard
 * Automated UAT scenarios covering critical user journeys and business requirements
 */

import { test, expect, Page, Browser } from '@playwright/test'
// Page Object Models will be created separately
// import { DashboardPage } from './pages/DashboardPage'
// import { PropertiesPage } from './pages/PropertiesPage'
// import { FinancialPage } from './pages/FinancialPage'
// import { UATTestData } from './data/UATTestData'

// Temporary inline Page Object Models for UAT
class DashboardPage {
  constructor(private page: Page) {}

  get totalPropertiesCard() { return this.page.locator('[data-testid="total-properties-card"]') }
  get activeTenantsCard() { return this.page.locator('[data-testid="active-tenants-card"]') }
  get monthlyRevenueCard() { return this.page.locator('[data-testid="monthly-revenue-card"]') }
  get occupancyRateCard() { return this.page.locator('[data-testid="occupancy-rate-card"]') }
  get liveUpdatesIndicator() { return this.page.locator('[data-testid="live-updates-indicator"]') }
  get mobileNavigation() { return this.page.locator('[data-testid="mobile-navigation"]') }
  get mobileMenuDrawer() { return this.page.locator('[data-testid="mobile-menu-drawer"]') }
  get customizationModal() { return this.page.locator('[data-testid="customization-modal"]') }

  async navigateToDashboard() {
    await this.page.goto(`${UAT_CONFIG.baseURL}/dashboard`)
  }

  async login(user: { email: string; password: string }) {
    await this.page.fill('[data-testid="email-input"]', user.email)
    await this.page.fill('[data-testid="password-input"]', user.password)
    await this.page.click('[data-testid="login-button"]')
  }

  async waitForDashboardLoad() {
    await this.page.waitForSelector('[data-testid="dashboard-loaded"]', { timeout: 10000 })
  }

  async clickPropertiesTab() {
    await this.page.click('[data-testid="properties-tab"]')
  }

  async clickFinancialTab() {
    await this.page.click('[data-testid="financial-tab"]')
  }

  async clickTenantsTab() {
    await this.page.click('[data-testid="tenants-tab"]')
  }

  async clickOverviewTab() {
    await this.page.click('[data-testid="overview-tab"]')
  }

  async getTotalProperties(): Promise<number> {
    const text = await this.totalPropertiesCard.locator('.metric-value').textContent()
    return parseInt(text || '0')
  }

  async getMonthlyRevenue(): Promise<number> {
    const text = await this.monthlyRevenueCard.locator('.metric-value').textContent()
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0')
  }

  async openMobileMenu() {
    await this.page.click('[data-testid="mobile-menu-button"]')
  }

  async tapPropertiesTab() {
    await this.page.tap('[data-testid="properties-tab"]')
  }

  async getMetricCardWidth(): Promise<number> {
    const box = await this.totalPropertiesCard.boundingBox()
    return box?.width || 0
  }

  async getMetricCardFontSize(): Promise<number> {
    const fontSize = await this.totalPropertiesCard.evaluate(el =>
      window.getComputedStyle(el).fontSize
    )
    return parseFloat(fontSize)
  }

  async openCustomizationSettings() {
    await this.page.click('[data-testid="customization-button"]')
  }

  async selectTheme(theme: string) {
    await this.page.click(`[data-testid="theme-${theme}"]`)
  }

  async saveCustomization() {
    await this.page.click('[data-testid="save-customization"]')
  }

  async hideWidget(widgetId: string) {
    await this.page.click(`[data-testid="hide-widget-${widgetId}"]`)
  }

  async resetToDefaults() {
    await this.page.click('[data-testid="reset-defaults"]')
  }

  async getWebSocketConnections(): Promise<number> {
    return await this.page.evaluate(() => {
      // Check for WebSocket connections
      return (window as any).__wsConnections?.length || 0
    })
  }
}

class PropertiesPage {
  constructor(private page: Page) {}

  get propertyAnalyticsHeader() { return this.page.locator('[data-testid="property-analytics-header"]') }

  async navigateToProperties() {
    await this.page.goto(`${UAT_CONFIG.baseURL}/dashboard/properties`)
  }

  async waitForPropertiesLoad() {
    await this.page.waitForSelector('[data-testid="properties-loaded"]', { timeout: 10000 })
  }

  async getPropertyCards() {
    return await this.page.locator('[data-testid="property-card"]').all()
  }

  async clickPropertyCard(index: number) {
    await this.page.click(`[data-testid="property-card"]:nth-child(${index + 1})`)
  }

  async waitForPropertyDetails() {
    await this.page.waitForSelector('[data-testid="property-details"]', { timeout: 5000 })
  }

  async getPropertyOccupancyRate(): Promise<number> {
    const text = await this.page.locator('[data-testid="property-occupancy-rate"]').textContent()
    return parseFloat(text?.replace('%', '') || '0')
  }

  async getPropertyMonthlyRevenue(): Promise<number> {
    const text = await this.page.locator('[data-testid="property-monthly-revenue"]').textContent()
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0')
  }

  async searchProperties(searchTerm: string) {
    await this.page.fill('[data-testid="property-search"]', searchTerm)
    await this.page.press('[data-testid="property-search"]', 'Enter')
  }

  async getSearchResults() {
    return await this.page.locator('[data-testid="search-result"]').all()
  }

  async clearSearch() {
    await this.page.click('[data-testid="clear-search"]')
  }

  async applyLocationFilter(location: string) {
    await this.page.selectOption('[data-testid="location-filter"]', location)
  }

  async applyPropertyTypeFilter(type: string) {
    await this.page.selectOption('[data-testid="property-type-filter"]', type)
  }

  async getFilteredResults() {
    return await this.page.locator('[data-testid="filtered-result"]').all()
  }

  async clearAllFilters() {
    await this.page.click('[data-testid="clear-all-filters"]')
  }

  async getAllProperties() {
    return await this.page.locator('[data-testid="property-item"]').all()
  }

  async waitForSearchResults() {
    await this.page.waitForSelector('[data-testid="search-results-loaded"]', { timeout: 5000 })
  }
}

class FinancialPage {
  constructor(private page: Page) {}

  get financialDashboardHeader() { return this.page.locator('[data-testid="financial-dashboard-header"]') }
  get revenueChart() { return this.page.locator('[data-testid="revenue-chart"]') }

  async navigateToFinancial() {
    await this.page.goto(`${UAT_CONFIG.baseURL}/dashboard/financial`)
  }

  async waitForFinancialLoad() {
    await this.page.waitForSelector('[data-testid="financial-loaded"]', { timeout: 10000 })
  }

  async getRevenueBreakdown() {
    return await this.page.locator('[data-testid="revenue-breakdown-item"]').all()
  }

  async getCollectionRate(): Promise<number> {
    const text = await this.page.locator('[data-testid="collection-rate"]').textContent()
    return parseFloat(text?.replace('%', '') || '0')
  }

  async setDateRange(range: string) {
    await this.page.selectOption('[data-testid="date-range-selector"]', range)
  }

  async waitForChartUpdate() {
    await this.page.waitForSelector('[data-testid="chart-updated"]', { timeout: 5000 })
  }

  async getTotalRevenue(): Promise<number> {
    const text = await this.page.locator('[data-testid="total-revenue"]').textContent()
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0')
  }

  async exportToPDF() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click('[data-testid="export-pdf-button"]')
    return await downloadPromise
  }

  async exportToExcel() {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.click('[data-testid="export-excel-button"]')
    return await downloadPromise
  }
}

class UATTestData {
  getTestPropertyName(): string {
    return 'Westlands Tower'
  }
}

// Test configuration
const UAT_CONFIG = {
  baseURL: process.env.UAT_BASE_URL || 'https://staging.mzimahomes.com',
  timeout: 30000,
  users: {
    propertyManager: {
      email: 'test.manager@mzimahomes.com',
      password: process.env.UAT_MANAGER_PASSWORD || 'TestPassword123!'
    },
    landlord: {
      email: 'test.landlord@mzimahomes.com',
      password: process.env.UAT_LANDLORD_PASSWORD || 'TestPassword123!'
    },
    admin: {
      email: 'test.admin@mzimahomes.com',
      password: process.env.UAT_ADMIN_PASSWORD || 'TestPassword123!'
    }
  }
}

// Test data
const testData = new UATTestData()

// Page Object Models
let dashboardPage: DashboardPage
let propertiesPage: PropertiesPage
let financialPage: FinancialPage

test.describe('Dashboard UAT - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page)
    propertiesPage = new PropertiesPage(page)
    financialPage = new FinancialPage(page)
    
    // Navigate to dashboard
    await page.goto(`${UAT_CONFIG.baseURL}/dashboard`)
  })

  test('TC001.1: Dashboard loads correctly with all metrics', async ({ page }) => {
    // Login as property manager
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    
    // Verify dashboard loads within performance budget
    const startTime = Date.now()
    await dashboardPage.waitForDashboardLoad()
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(3000) // 3 second load time requirement
    
    // Verify all metric cards are present
    await expect(dashboardPage.totalPropertiesCard).toBeVisible()
    await expect(dashboardPage.activeTenantsCard).toBeVisible()
    await expect(dashboardPage.monthlyRevenueCard).toBeVisible()
    await expect(dashboardPage.occupancyRateCard).toBeVisible()
    
    // Verify metrics show actual data (not loading states)
    const totalProperties = await dashboardPage.getTotalProperties()
    expect(totalProperties).toBeGreaterThan(0)
    
    const monthlyRevenue = await dashboardPage.getMonthlyRevenue()
    expect(monthlyRevenue).toBeGreaterThan(0)
    
    // Verify real-time indicator is active
    await expect(dashboardPage.liveUpdatesIndicator).toContainText('Live updates active')
  })

  test('TC001.2: Tab navigation works smoothly', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await dashboardPage.waitForDashboardLoad()
    
    // Test Properties tab
    const propertiesStartTime = Date.now()
    await dashboardPage.clickPropertiesTab()
    await propertiesPage.waitForPropertiesLoad()
    const propertiesLoadTime = Date.now() - propertiesStartTime
    
    expect(propertiesLoadTime).toBeLessThan(2000) // 2 second navigation requirement
    await expect(propertiesPage.propertyAnalyticsHeader).toBeVisible()
    
    // Test Financial tab
    const financialStartTime = Date.now()
    await dashboardPage.clickFinancialTab()
    await financialPage.waitForFinancialLoad()
    const financialLoadTime = Date.now() - financialStartTime
    
    expect(financialLoadTime).toBeLessThan(2000)
    await expect(financialPage.financialDashboardHeader).toBeVisible()
    
    // Test Tenants tab
    await dashboardPage.clickTenantsTab()
    await expect(page.locator('[data-testid="tenant-analytics"]')).toBeVisible()
    
    // Return to Overview
    await dashboardPage.clickOverviewTab()
    await expect(dashboardPage.totalPropertiesCard).toBeVisible()
  })

  test('TC002.1: Property performance metrics are accurate', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await dashboardPage.waitForDashboardLoad()
    
    // Navigate to Properties tab
    await dashboardPage.clickPropertiesTab()
    await propertiesPage.waitForPropertiesLoad()
    
    // Verify property cards display
    const propertyCards = await propertiesPage.getPropertyCards()
    expect(propertyCards.length).toBeGreaterThan(0)
    
    // Click on first property for detailed view
    await propertiesPage.clickPropertyCard(0)
    await propertiesPage.waitForPropertyDetails()
    
    // Verify detailed metrics
    const occupancyRate = await propertiesPage.getPropertyOccupancyRate()
    expect(occupancyRate).toBeGreaterThanOrEqual(0)
    expect(occupancyRate).toBeLessThanOrEqual(100)
    
    const monthlyRevenue = await propertiesPage.getPropertyMonthlyRevenue()
    expect(monthlyRevenue).toBeGreaterThanOrEqual(0)
    
    // Verify data consistency with overview
    const overviewRevenue = await dashboardPage.getMonthlyRevenue()
    // Property revenue should contribute to total revenue
    expect(overviewRevenue).toBeGreaterThanOrEqual(monthlyRevenue)
  })

  test('TC002.2: Property search and filtering works effectively', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await propertiesPage.navigateToProperties()
    
    // Test search functionality
    const searchTerm = testData.getTestPropertyName()
    await propertiesPage.searchProperties(searchTerm)
    
    const searchResults = await propertiesPage.getSearchResults()
    expect(searchResults.length).toBeGreaterThan(0)
    
    // Verify search results contain search term
    for (const result of searchResults) {
      const propertyName = await result.textContent()
      expect(propertyName?.toLowerCase()).toContain(searchTerm.toLowerCase())
    }
    
    // Test location filter
    await propertiesPage.clearSearch()
    await propertiesPage.applyLocationFilter('Westlands')
    
    const filteredResults = await propertiesPage.getFilteredResults()
    expect(filteredResults.length).toBeGreaterThan(0)
    
    // Test combined filters
    await propertiesPage.applyPropertyTypeFilter('APARTMENT')
    const combinedResults = await propertiesPage.getFilteredResults()
    expect(combinedResults.length).toBeLessThanOrEqual(filteredResults.length)
    
    // Clear filters
    await propertiesPage.clearAllFilters()
    const allResults = await propertiesPage.getAllProperties()
    expect(allResults.length).toBeGreaterThanOrEqual(combinedResults.length)
  })

  test('TC003.1: Financial metrics are accurate and well-presented', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await financialPage.navigateToFinancial()
    
    // Verify revenue chart displays
    await expect(financialPage.revenueChart).toBeVisible()
    
    // Check revenue breakdown
    const revenueBreakdown = await financialPage.getRevenueBreakdown()
    expect(revenueBreakdown.length).toBeGreaterThan(0)
    
    // Verify collection rates
    const collectionRate = await financialPage.getCollectionRate()
    expect(collectionRate).toBeGreaterThanOrEqual(0)
    expect(collectionRate).toBeLessThanOrEqual(100)
    
    // Test date range filtering
    await financialPage.setDateRange('last-30-days')
    await financialPage.waitForChartUpdate()
    
    const filteredRevenue = await financialPage.getTotalRevenue()
    expect(filteredRevenue).toBeGreaterThanOrEqual(0)
    
    // Change to last 90 days
    await financialPage.setDateRange('last-90-days')
    await financialPage.waitForChartUpdate()
    
    const extendedRevenue = await financialPage.getTotalRevenue()
    expect(extendedRevenue).toBeGreaterThanOrEqual(filteredRevenue)
  })

  test('TC003.2: Financial export functionality works correctly', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await financialPage.navigateToFinancial()
    
    // Test PDF export
    const pdfStartTime = Date.now()
    const pdfDownload = await financialPage.exportToPDF()
    const pdfExportTime = Date.now() - pdfStartTime
    
    expect(pdfExportTime).toBeLessThan(10000) // 10 second export requirement
    expect(pdfDownload).toBeTruthy()
    
    // Verify PDF file properties
    const pdfPath = await pdfDownload.path()
    expect(pdfPath).toBeTruthy()
    
    // Test Excel export
    const excelStartTime = Date.now()
    const excelDownload = await financialPage.exportToExcel()
    const excelExportTime = Date.now() - excelStartTime
    
    expect(excelExportTime).toBeLessThan(10000)
    expect(excelDownload).toBeTruthy()
    
    // Verify Excel file properties
    const excelPath = await excelDownload.path()
    expect(excelPath).toBeTruthy()
  })
})

test.describe('Dashboard UAT - Real-time Features', () => {
  test('TC004.1: Real-time updates work correctly', async ({ browser }) => {
    // Create two browser contexts to simulate multiple users
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    
    const dashboard1 = new DashboardPage(page1)
    const dashboard2 = new DashboardPage(page2)
    
    // Login to both sessions
    await dashboard1.navigateToDashboard()
    await dashboard1.login(UAT_CONFIG.users.propertyManager)
    
    await dashboard2.navigateToDashboard()
    await dashboard2.login(UAT_CONFIG.users.admin)
    
    // Get initial metrics from first session
    const initialRevenue = await dashboard1.getMonthlyRevenue()
    
    // Simulate data update in second session (if update functionality exists)
    // This would typically involve updating property data through the admin interface
    // For UAT, we'll verify that the real-time connection is active
    
    // Verify real-time indicators are active in both sessions
    await expect(dashboard1.liveUpdatesIndicator).toContainText('Live updates active')
    await expect(dashboard2.liveUpdatesIndicator).toContainText('Live updates active')
    
    // Verify WebSocket connections are established
    const wsConnections1 = await dashboard1.getWebSocketConnections()
    const wsConnections2 = await dashboard2.getWebSocketConnections()
    
    expect(wsConnections1).toBeGreaterThan(0)
    expect(wsConnections2).toBeGreaterThan(0)
    
    await context1.close()
    await context2.close()
  })
})

test.describe('Dashboard UAT - Mobile Responsiveness', () => {
  test('TC005.1: Mobile dashboard experience', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    })
    
    const mobilePage = await mobileContext.newPage()
    const mobileDashboard = new DashboardPage(mobilePage)
    
    await mobileDashboard.navigateToDashboard()
    await mobileDashboard.login(UAT_CONFIG.users.propertyManager)
    
    // Verify mobile layout
    await expect(mobileDashboard.mobileNavigation).toBeVisible()
    
    // Test mobile navigation
    await mobileDashboard.openMobileMenu()
    await expect(mobileDashboard.mobileMenuDrawer).toBeVisible()
    
    // Test metric cards on mobile
    await expect(mobileDashboard.totalPropertiesCard).toBeVisible()
    const cardWidth = await mobileDashboard.getMetricCardWidth()
    expect(cardWidth).toBeLessThan(375) // Should fit mobile screen
    
    // Test touch interactions
    await mobileDashboard.tapPropertiesTab()
    await expect(mobilePage.locator('[data-testid="property-analytics"]')).toBeVisible()
    
    // Verify text is readable without zooming
    const fontSize = await mobileDashboard.getMetricCardFontSize()
    expect(fontSize).toBeGreaterThanOrEqual(14) // Minimum readable font size
    
    await mobileContext.close()
  })
})

test.describe('Dashboard UAT - Performance and Usability', () => {
  test('TC007.1: Dashboard performance meets requirements', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    
    // Measure initial page load
    const navigationStartTime = Date.now()
    await dashboardPage.waitForDashboardLoad()
    const totalLoadTime = Date.now() - navigationStartTime
    
    expect(totalLoadTime).toBeLessThan(3000) // 3 second requirement
    
    // Test navigation performance
    const tabSwitchStartTime = Date.now()
    await dashboardPage.clickPropertiesTab()
    await propertiesPage.waitForPropertiesLoad()
    const tabSwitchTime = Date.now() - tabSwitchStartTime
    
    expect(tabSwitchTime).toBeLessThan(2000) // 2 second requirement
    
    // Test search performance
    const searchStartTime = Date.now()
    await propertiesPage.searchProperties('Westlands')
    await propertiesPage.waitForSearchResults()
    const searchTime = Date.now() - searchStartTime
    
    expect(searchTime).toBeLessThan(1000) // 1 second requirement
    
    // Monitor memory usage (if available)
    const memoryUsage = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })
    
    if (memoryUsage > 0) {
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024) // 100MB limit
    }
  })
})

test.describe('Dashboard UAT - User Customization', () => {
  test('TC006.1: Dashboard customization works correctly', async ({ page }) => {
    await dashboardPage.login(UAT_CONFIG.users.propertyManager)
    await dashboardPage.waitForDashboardLoad()
    
    // Open customization settings
    await dashboardPage.openCustomizationSettings()
    await expect(dashboardPage.customizationModal).toBeVisible()
    
    // Change theme to dark mode
    await dashboardPage.selectTheme('dark')
    await dashboardPage.saveCustomization()
    
    // Verify theme change applied
    await expect(page.locator('body')).toHaveClass(/dark-theme/)
    
    // Test widget customization
    await dashboardPage.openCustomizationSettings()
    await dashboardPage.hideWidget('tenant-analytics')
    await dashboardPage.saveCustomization()
    
    // Verify widget is hidden
    await expect(page.locator('[data-testid="tenant-analytics-widget"]')).not.toBeVisible()
    
    // Refresh page and verify settings persist
    await page.reload()
    await dashboardPage.waitForDashboardLoad()
    
    await expect(page.locator('body')).toHaveClass(/dark-theme/)
    await expect(page.locator('[data-testid="tenant-analytics-widget"]')).not.toBeVisible()
    
    // Reset to default settings
    await dashboardPage.openCustomizationSettings()
    await dashboardPage.resetToDefaults()
    await dashboardPage.saveCustomization()
  })
})

// Utility functions for UAT reporting
export class UATReporter {
  static generateReport(results: any[]): string {
    const passedTests = results.filter(r => r.status === 'passed').length
    const failedTests = results.filter(r => r.status === 'failed').length
    const totalTests = results.length
    const passRate = (passedTests / totalTests) * 100
    
    return `
UAT Execution Report
===================
Total Tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Pass Rate: ${passRate.toFixed(2)}%

Test Results:
${results.map(r => `- ${r.title}: ${r.status.toUpperCase()}`).join('\n')}
    `
  }
  
  static async captureScreenshot(page: Page, testName: string): Promise<string> {
    const screenshotPath = `./test-results/uat-screenshots/${testName}-${Date.now()}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    return screenshotPath
  }
}
