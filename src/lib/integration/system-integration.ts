// Final System Integration and Testing Framework
import { createClient } from '@supabase/supabase-js'
import { BusinessRulesValidator } from '../validation/business-rules'
import { PerformanceMonitor } from '../performance/optimization'
import { AuditService } from '../security/encryption'
import { mpesaService } from '../services/mpesa'
import { documentService } from '../services/documents'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// System Integration Test Suite
export class SystemIntegrationTester {
  // Test complete sales workflow
  static async testSalesWorkflow(): Promise<{
    success: boolean
    steps: Array<{ step: string; status: 'pass' | 'fail'; message?: string }>
  }> {
    const steps = []
    let testClient: any = null
    let testPlot: any = null
    let testListing: any = null
    let testOffer: any = null
    let testAgreement: any = null

    try {
      // Step 1: Create test client
      const clientData = {
        full_name: 'Integration Test Client',
        id_number: `TEST${Date.now()}`,
        phone: '+254701234567',
        email: 'test@integration.com',
        source: 'walk_in' as const
      }

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()

      if (clientError) throw new Error(`Client creation failed: ${clientError.message}`)
      
      testClient = client
      steps.push({ step: 'Create Client', status: 'pass' })

      // Step 2: Get available plot
      const { data: availablePlots } = await supabase
        .from('plots')
        .select('*')
        .eq('stage', 'ready_for_sale')
        .limit(1)

      if (!availablePlots || availablePlots.length === 0) {
        throw new Error('No available plots for testing')
      }

      testPlot = availablePlots[0]
      steps.push({ step: 'Find Available Plot', status: 'pass' })

      // Step 3: Create listing
      const listingData = {
        plot_id: testPlot.plot_id,
        pricing_strategy: 'flat' as const,
        list_price: 500000,
        terms: 'installments' as const,
        status: 'active' as const,
        marketing_description: 'Integration test listing',
        listed_date: new Date().toISOString().split('T')[0]
      }

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert(listingData)
        .select()
        .single()

      if (listingError) throw new Error(`Listing creation failed: ${listingError.message}`)
      
      testListing = listing
      steps.push({ step: 'Create Listing', status: 'pass' })

      // Step 4: Create offer/reservation
      const offerData = {
        plot_id: testPlot.plot_id,
        client_id: testClient.client_id,
        offer_price: 480000,
        reservation_fee: 50000,
        reservation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'reserved' as const
      }

      const { data: offer, error: offerError } = await supabase
        .from('offers_reservations')
        .insert(offerData)
        .select()
        .single()

      if (offerError) throw new Error(`Offer creation failed: ${offerError.message}`)
      
      testOffer = offer
      steps.push({ step: 'Create Offer/Reservation', status: 'pass' })

      // Step 5: Accept offer
      const { error: acceptError } = await supabase
        .from('offers_reservations')
        .update({ status: 'accepted' })
        .eq('offer_id', testOffer.offer_id)

      if (acceptError) throw new Error(`Offer acceptance failed: ${acceptError.message}`)
      
      steps.push({ step: 'Accept Offer', status: 'pass' })

      // Step 6: Create sale agreement
      const agreementData = {
        agreement_no: `TEST-AGR-${Date.now()}`,
        plot_id: testPlot.plot_id,
        client_id: testClient.client_id,
        agreement_date: new Date().toISOString().split('T')[0],
        price: 480000,
        deposit_required: 100000,
        deposit_paid: 50000,
        status: 'active' as const
      }

      const { data: agreement, error: agreementError } = await supabase
        .from('sale_agreements')
        .insert(agreementData)
        .select()
        .single()

      if (agreementError) throw new Error(`Agreement creation failed: ${agreementError.message}`)
      
      testAgreement = agreement
      steps.push({ step: 'Create Sale Agreement', status: 'pass' })

      // Step 7: Create receipt
      const receiptData = {
        receipt_no: `TEST-RCP-${Date.now()}`,
        sale_agreement_id: testAgreement.sale_agreement_id,
        payment_method: 'cash' as const,
        transaction_ref: `TEST${Date.now()}`,
        paid_date: new Date().toISOString().split('T')[0],
        amount: 50000,
        payer_name: testClient.full_name
      }

      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert(receiptData)
        .select()
        .single()

      if (receiptError) throw new Error(`Receipt creation failed: ${receiptError.message}`)
      
      steps.push({ step: 'Create Receipt', status: 'pass' })

      // Step 8: Verify balance update
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait for triggers

      const { data: updatedAgreement } = await supabase
        .from('sale_agreements')
        .select('balance_due')
        .eq('sale_agreement_id', testAgreement.sale_agreement_id)
        .single()

      if (updatedAgreement?.balance_due !== 430000) {
        throw new Error('Balance calculation incorrect')
      }

      steps.push({ step: 'Verify Balance Update', status: 'pass' })

      return { success: true, steps }

    } catch (error) {
      steps.push({ 
        step: 'Error', 
        status: 'fail', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      return { success: false, steps }

    } finally {
      // Cleanup test data
      await this.cleanupTestData({
        client: testClient,
        listing: testListing,
        offer: testOffer,
        agreement: testAgreement
      })
    }
  }

  // Test M-PESA integration
  static async testMpesaIntegration(): Promise<{
    success: boolean
    tests: Array<{ test: string; status: 'pass' | 'fail'; message?: string }>
  }> {
    const tests = []

    try {
      // Test phone number validation
      const validPhone = '+254701234567'
      const invalidPhone = '123456'
      
      if (mpesaService.isValidPhoneNumber(validPhone)) {
        tests.push({ test: 'Valid Phone Number', status: 'pass' })
      } else {
        tests.push({ test: 'Valid Phone Number', status: 'fail', message: 'Valid phone rejected' })
      }

      if (!mpesaService.isValidPhoneNumber(invalidPhone)) {
        tests.push({ test: 'Invalid Phone Number', status: 'pass' })
      } else {
        tests.push({ test: 'Invalid Phone Number', status: 'fail', message: 'Invalid phone accepted' })
      }

      // Test amount formatting
      const formattedAmount = mpesaService.formatAmount(1000)
      if (formattedAmount.includes('1,000')) {
        tests.push({ test: 'Amount Formatting', status: 'pass' })
      } else {
        tests.push({ test: 'Amount Formatting', status: 'fail', message: 'Incorrect format' })
      }

      // Test reference generation
      const reference = mpesaService.generatePaymentReference('TEST')
      if (reference.startsWith('TEST') && reference.length > 4) {
        tests.push({ test: 'Reference Generation', status: 'pass' })
      } else {
        tests.push({ test: 'Reference Generation', status: 'fail', message: 'Invalid reference format' })
      }

      return { success: true, tests }

    } catch (error) {
      tests.push({ 
        test: 'M-PESA Integration', 
        status: 'fail', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      return { success: false, tests }
    }
  }

  // Test business rules validation
  static async testBusinessRules(): Promise<{
    success: boolean
    validations: Array<{ rule: string; status: 'pass' | 'fail'; message?: string }>
  }> {
    const validations = []

    try {
      // Test parcel validation
      const validParcel = {
        lr_number: `TEST/LR/${Date.now()}`,
        registry_office: 'Test Registry',
        county: 'Test County',
        tenure: 'freehold' as const,
        acreage_ha: 1.0,
        current_use: 'residential' as const
      }

      const parcelValidation = await BusinessRulesValidator.validateParcel(validParcel)
      if (parcelValidation.isValid) {
        validations.push({ rule: 'Valid Parcel Data', status: 'pass' })
      } else {
        validations.push({ 
          rule: 'Valid Parcel Data', 
          status: 'fail', 
          message: parcelValidation.errors[0]?.message 
        })
      }

      // Test invalid parcel
      const invalidParcel = {
        lr_number: '',
        acreage_ha: -1,
        tenure: 'invalid' as any
      }

      const invalidParcelValidation = await BusinessRulesValidator.validateParcel(invalidParcel)
      if (!invalidParcelValidation.isValid) {
        validations.push({ rule: 'Invalid Parcel Rejection', status: 'pass' })
      } else {
        validations.push({ rule: 'Invalid Parcel Rejection', status: 'fail', message: 'Invalid data accepted' })
      }

      // Test client validation
      const validClient = {
        full_name: 'Test Client',
        id_number: '12345678',
        phone: '+254701234567',
        email: 'test@example.com',
        source: 'walk_in' as const
      }

      const clientValidation = await BusinessRulesValidator.validateClient(validClient)
      if (clientValidation.isValid) {
        validations.push({ rule: 'Valid Client Data', status: 'pass' })
      } else {
        validations.push({ 
          rule: 'Valid Client Data', 
          status: 'fail', 
          message: clientValidation.errors[0]?.message 
        })
      }

      return { success: true, validations }

    } catch (error) {
      validations.push({ 
        rule: 'Business Rules', 
        status: 'fail', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      return { success: false, validations }
    }
  }

  // Test performance benchmarks
  static async testPerformance(): Promise<{
    success: boolean
    benchmarks: Array<{ operation: string; duration: number; status: 'pass' | 'fail' }>
  }> {
    const benchmarks = []

    try {
      // Test database query performance
      const startTime = Date.now()
      
      const { data: parcels } = await supabase
        .from('parcels')
        .select('*')
        .limit(100)

      const queryDuration = Date.now() - startTime
      benchmarks.push({
        operation: 'Database Query (100 parcels)',
        duration: queryDuration,
        status: queryDuration < 1000 ? 'pass' : 'fail'
      })

      // Test complex join query
      const joinStartTime = Date.now()
      
      const { data: plotsWithSubdivisions } = await supabase
        .from('plots')
        .select(`
          *,
          subdivisions(name, status),
          sale_agreements(status, price)
        `)
        .limit(50)

      const joinDuration = Date.now() - joinStartTime
      benchmarks.push({
        operation: 'Complex Join Query (50 plots)',
        duration: joinDuration,
        status: joinDuration < 2000 ? 'pass' : 'fail'
      })

      // Test aggregation query
      const aggStartTime = Date.now()
      
      const { data: stats } = await supabase
        .rpc('get_sales_dashboard_data')

      const aggDuration = Date.now() - aggStartTime
      benchmarks.push({
        operation: 'Aggregation Query (dashboard)',
        duration: aggDuration,
        status: aggDuration < 3000 ? 'pass' : 'fail'
      })

      return { success: true, benchmarks }

    } catch (error) {
      benchmarks.push({
        operation: 'Performance Test',
        duration: -1,
        status: 'fail'
      })
      return { success: false, benchmarks }
    }
  }

  // Test data integrity
  static async testDataIntegrity(): Promise<{
    success: boolean
    checks: Array<{ check: string; status: 'pass' | 'fail'; count?: number }>
  }> {
    const checks = []

    try {
      // Check for orphaned plots
      const { data: orphanedPlots } = await supabase
        .from('plots')
        .select('plot_id')
        .is('subdivisions.subdivision_id', null)

      checks.push({
        check: 'Orphaned Plots',
        status: (orphanedPlots?.length || 0) === 0 ? 'pass' : 'fail',
        count: orphanedPlots?.length || 0
      })

      // Check for negative balances
      const { data: negativeBalances } = await supabase
        .from('sale_agreements')
        .select('sale_agreement_id')
        .lt('balance_due', 0)

      checks.push({
        check: 'Negative Balances',
        status: (negativeBalances?.length || 0) === 0 ? 'pass' : 'fail',
        count: negativeBalances?.length || 0
      })

      // Check for duplicate LR numbers
      const { data: duplicateLRs } = await supabase
        .rpc('find_duplicate_lr_numbers')

      checks.push({
        check: 'Duplicate LR Numbers',
        status: (duplicateLRs?.length || 0) === 0 ? 'pass' : 'fail',
        count: duplicateLRs?.length || 0
      })

      return { success: true, checks }

    } catch (error) {
      checks.push({
        check: 'Data Integrity',
        status: 'fail'
      })
      return { success: false, checks }
    }
  }

  // Run comprehensive system test
  static async runComprehensiveTest(): Promise<{
    success: boolean
    summary: {
      salesWorkflow: any
      mpesaIntegration: any
      businessRules: any
      performance: any
      dataIntegrity: any
    }
  }> {
    console.log('Starting comprehensive system test...')

    const [
      salesWorkflow,
      mpesaIntegration,
      businessRules,
      performance,
      dataIntegrity
    ] = await Promise.all([
      this.testSalesWorkflow(),
      this.testMpesaIntegration(),
      this.testBusinessRules(),
      this.testPerformance(),
      this.testDataIntegrity()
    ])

    const overallSuccess = 
      salesWorkflow.success &&
      mpesaIntegration.success &&
      businessRules.success &&
      performance.success &&
      dataIntegrity.success

    console.log('Comprehensive system test completed:', overallSuccess ? 'PASS' : 'FAIL')

    return {
      success: overallSuccess,
      summary: {
        salesWorkflow,
        mpesaIntegration,
        businessRules,
        performance,
        dataIntegrity
      }
    }
  }

  // Cleanup test data
  private static async cleanupTestData(testData: any): Promise<void> {
    try {
      if (testData.agreement) {
        await supabase
          .from('sale_agreements')
          .delete()
          .eq('sale_agreement_id', testData.agreement.sale_agreement_id)
      }

      if (testData.offer) {
        await supabase
          .from('offers_reservations')
          .delete()
          .eq('offer_id', testData.offer.offer_id)
      }

      if (testData.listing) {
        await supabase
          .from('listings')
          .delete()
          .eq('listing_id', testData.listing.listing_id)
      }

      if (testData.client) {
        await supabase
          .from('clients')
          .delete()
          .eq('client_id', testData.client.client_id)
      }

      console.log('Test data cleanup completed')
    } catch (error) {
      console.error('Error cleaning up test data:', error)
    }
  }
}

// System health monitor
export class SystemHealthMonitor {
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    components: Array<{
      name: string
      status: 'healthy' | 'warning' | 'critical'
      message?: string
      metrics?: any
    }>
  }> {
    const components = []

    // Database health
    try {
      const dbStart = Date.now()
      await supabase.from('parcels').select('count').limit(1)
      const dbDuration = Date.now() - dbStart

      components.push({
        name: 'Database',
        status: dbDuration < 1000 ? 'healthy' : 'warning',
        metrics: { responseTime: dbDuration }
      })
    } catch (error) {
      components.push({
        name: 'Database',
        status: 'critical',
        message: 'Database connection failed'
      })
    }

    // Performance metrics
    const performanceMetrics = PerformanceMonitor.getAllMetrics()
    const avgResponseTime = Object.values(performanceMetrics).reduce((avg: number, metric: any) => {
      return avg + (metric?.average || 0)
    }, 0) / Object.keys(performanceMetrics).length

    components.push({
      name: 'Performance',
      status: avgResponseTime < 2000 ? 'healthy' : avgResponseTime < 5000 ? 'warning' : 'critical',
      metrics: { averageResponseTime: avgResponseTime }
    })

    // Determine overall status
    const criticalCount = components.filter(c => c.status === 'critical').length
    const warningCount = components.filter(c => c.status === 'warning').length

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    if (criticalCount > 0) {
      overallStatus = 'critical'
    } else if (warningCount > 0) {
      overallStatus = 'warning'
    }

    return {
      status: overallStatus,
      components
    }
  }
}

// Export integration utilities
export const integrationUtils = {
  runTests: SystemIntegrationTester.runComprehensiveTest,
  checkHealth: SystemHealthMonitor.getSystemHealth,
  testSalesWorkflow: SystemIntegrationTester.testSalesWorkflow,
  testMpesa: SystemIntegrationTester.testMpesaIntegration,
  testBusinessRules: SystemIntegrationTester.testBusinessRules,
  testPerformance: SystemIntegrationTester.testPerformance,
  testDataIntegrity: SystemIntegrationTester.testDataIntegrity
}
