// Integration tests for complete sales workflow
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import {
  clientApi,
  listingApi,
  offerReservationApi,
  saleAgreementApi,
  receiptApi,
} from '../../lib/api/sales'
import { plotApi } from '../../lib/api/subdivisions'
import { mpesaService } from '../../lib/services/mpesa'

// Test database setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Complete Sales Workflow Integration Tests', () => {
  let testData: {
    plotId: string
    clientId: string
    listingId: string
    offerId: string
    agreementId: string
    receiptId: string
  }

  beforeAll(async () => {
    // Setup test data
    testData = {
      plotId: '',
      clientId: '',
      listingId: '',
      offerId: '',
      agreementId: '',
      receiptId: '',
    }
  })

  afterAll(async () => {
    // Cleanup test data
    if (testData.receiptId) {
      await supabase.from('receipts').delete().eq('receipt_id', testData.receiptId)
    }
    if (testData.agreementId) {
      await supabase.from('sale_agreements').delete().eq('sale_agreement_id', testData.agreementId)
    }
    if (testData.offerId) {
      await supabase.from('offers_reservations').delete().eq('offer_id', testData.offerId)
    }
    if (testData.listingId) {
      await supabase.from('listings').delete().eq('listing_id', testData.listingId)
    }
    if (testData.clientId) {
      await supabase.from('clients').delete().eq('client_id', testData.clientId)
    }
  })

  describe('Step 1: Client Registration', () => {
    it('should create a new client successfully', async () => {
      const clientData = {
        full_name: 'John Doe Test',
        id_number: 'TEST123456789',
        phone: '+254701234567',
        email: 'john.doe.test@example.com',
        source: 'walk_in' as const,
        notes: 'Test client for integration testing',
      }

      const client = await clientApi.create(clientData)

      expect(client).toBeDefined()
      expect(client.full_name).toBe(clientData.full_name)
      expect(client.id_number).toBe(clientData.id_number)
      expect(client.phone).toBe(clientData.phone)

      testData.clientId = client.client_id
    })

    it('should validate client data correctly', async () => {
      const invalidClientData = {
        full_name: '',
        id_number: '',
        phone: '',
        source: 'walk_in' as const,
      }

      await expect(clientApi.create(invalidClientData)).rejects.toThrow()
    })
  })

  describe('Step 2: Plot Listing', () => {
    it('should create a plot listing successfully', async () => {
      // First, get an available plot
      const availablePlots = await plotApi.getAvailable()
      expect(availablePlots.length).toBeGreaterThan(0)

      testData.plotId = availablePlots[0].plot_id

      const listingData = {
        plot_id: testData.plotId,
        pricing_strategy: 'flat' as const,
        list_price: 500000,
        terms: 'installments' as const,
        status: 'active' as const,
        marketing_description: 'Beautiful plot in prime location',
        key_features: ['Corner plot', 'Near road', 'Water access'],
        listed_date: new Date().toISOString().split('T')[0],
      }

      const listing = await listingApi.create(listingData)

      expect(listing).toBeDefined()
      expect(listing.plot_id).toBe(testData.plotId)
      expect(listing.list_price).toBe(listingData.list_price)
      expect(listing.status).toBe('active')

      testData.listingId = listing.listing_id
    })

    it('should retrieve active listings', async () => {
      const activeListings = await listingApi.getActive()

      expect(activeListings).toBeDefined()
      expect(Array.isArray(activeListings)).toBe(true)

      const ourListing = activeListings.find((l) => l.listing_id === testData.listingId)
      expect(ourListing).toBeDefined()
    })
  })

  describe('Step 3: Offer and Reservation', () => {
    it('should create an offer/reservation successfully', async () => {
      const offerData = {
        plot_id: testData.plotId,
        client_id: testData.clientId,
        offer_price: 480000,
        reservation_fee: 50000,
        reservation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'reserved' as const,
        special_conditions: 'Payment plan required',
      }

      const offer = await offerReservationApi.create(offerData)

      expect(offer).toBeDefined()
      expect(offer.plot_id).toBe(testData.plotId)
      expect(offer.client_id).toBe(testData.clientId)
      expect(offer.offer_price).toBe(offerData.offer_price)
      expect(offer.status).toBe('reserved')

      testData.offerId = offer.offer_id
    })

    it('should accept the offer', async () => {
      const acceptedOffer = await offerReservationApi.accept(testData.offerId)

      expect(acceptedOffer).toBeDefined()
      expect(acceptedOffer.status).toBe('accepted')
    })
  })

  describe('Step 4: Sale Agreement', () => {
    it('should create a sale agreement successfully', async () => {
      const agreementData = {
        agreement_no: `AGR-TEST-${Date.now()}`,
        plot_id: testData.plotId,
        client_id: testData.clientId,
        agreement_date: new Date().toISOString().split('T')[0],
        price: 480000,
        deposit_required: 100000,
        deposit_paid: 50000,
        status: 'active' as const,
        special_conditions: 'Balance payable in 12 monthly installments',
      }

      const agreement = await saleAgreementApi.create(agreementData)

      expect(agreement).toBeDefined()
      expect(agreement.agreement_no).toBe(agreementData.agreement_no)
      expect(agreement.plot_id).toBe(testData.plotId)
      expect(agreement.client_id).toBe(testData.clientId)
      expect(agreement.price).toBe(agreementData.price)
      expect(agreement.status).toBe('active')

      testData.agreementId = agreement.sale_agreement_id
    })

    it('should calculate balance correctly', async () => {
      const agreement = await saleAgreementApi.getById(testData.agreementId)

      expect(agreement).toBeDefined()
      expect(agreement.balance_due).toBe(430000) // 480000 - 50000
    })
  })

  describe('Step 5: Payment Processing', () => {
    it('should create a receipt successfully', async () => {
      const receiptData = {
        receipt_no: `RCP-TEST-${Date.now()}`,
        sale_agreement_id: testData.agreementId,
        payment_method: 'mpesa' as const,
        transaction_ref: `TEST${Date.now()}`,
        paid_date: new Date().toISOString().split('T')[0],
        amount: 50000,
        payer_name: 'John Doe Test',
      }

      const receipt = await receiptApi.create(receiptData)

      expect(receipt).toBeDefined()
      expect(receipt.receipt_no).toBe(receiptData.receipt_no)
      expect(receipt.sale_agreement_id).toBe(testData.agreementId)
      expect(receipt.amount).toBe(receiptData.amount)

      testData.receiptId = receipt.receipt_id
    })

    it('should update agreement balance after payment', async () => {
      // Wait a moment for triggers to process
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const agreement = await saleAgreementApi.getById(testData.agreementId)

      expect(agreement).toBeDefined()
      expect(agreement.balance_due).toBe(380000) // 430000 - 50000
    })
  })

  describe('Step 6: M-PESA Integration', () => {
    it('should validate phone number correctly', async () => {
      const validPhone = '+254701234567'
      const invalidPhone = '123456'

      expect(mpesaService.isValidPhoneNumber(validPhone)).toBe(true)
      expect(mpesaService.isValidPhoneNumber(invalidPhone)).toBe(false)
    })

    it('should format payment reference correctly', async () => {
      const reference = mpesaService.generatePaymentReference('TEST')

      expect(reference).toMatch(/^TEST\d+$/)
      expect(reference.length).toBeGreaterThan(4)
    })
  })

  describe('Step 7: Business Rules Validation', () => {
    it('should prevent duplicate reservations on same plot', async () => {
      const duplicateOfferData = {
        plot_id: testData.plotId,
        client_id: testData.clientId,
        offer_price: 480000,
        reservation_fee: 50000,
        reservation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'reserved' as const,
      }

      // This should fail because plot is already reserved
      await expect(offerReservationApi.create(duplicateOfferData)).rejects.toThrow()
    })

    it('should validate price constraints', async () => {
      const invalidPriceData = {
        plot_id: testData.plotId,
        client_id: testData.clientId,
        offer_price: -1000, // Negative price should fail
        reservation_fee: 50000,
        reservation_date: new Date().toISOString().split('T')[0],
        expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'reserved' as const,
      }

      await expect(offerReservationApi.create(invalidPriceData)).rejects.toThrow()
    })
  })

  describe('Step 8: Data Integrity Checks', () => {
    it('should maintain referential integrity', async () => {
      // Verify all relationships exist
      const agreement = await saleAgreementApi.getById(testData.agreementId)
      expect(agreement).toBeDefined()
      expect(agreement.plot_id).toBe(testData.plotId)
      expect(agreement.client_id).toBe(testData.clientId)

      const receipts = await receiptApi.getBySaleAgreement(testData.agreementId)
      expect(receipts.length).toBeGreaterThan(0)
      expect(receipts[0].sale_agreement_id).toBe(testData.agreementId)
    })

    it('should calculate totals correctly', async () => {
      const agreement = await saleAgreementApi.getById(testData.agreementId)
      const receipts = await receiptApi.getBySaleAgreement(testData.agreementId)

      const totalPaid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0)
      const expectedBalance = agreement.price - totalPaid

      expect(agreement.balance_due).toBe(expectedBalance)
    })
  })

  describe('Step 9: Workflow State Management', () => {
    it('should track plot status changes', async () => {
      const plot = await plotApi.getById(testData.plotId)

      expect(plot).toBeDefined()
      // Plot should be marked as sold or reserved
      expect(['sold', 'reserved']).toContain(plot.stage)
    })

    it('should handle agreement status transitions', async () => {
      // Test status transition from active to settled
      const fullPaymentReceipt = {
        receipt_no: `RCP-FINAL-${Date.now()}`,
        sale_agreement_id: testData.agreementId,
        payment_method: 'bank_eft' as const,
        transaction_ref: `FINAL${Date.now()}`,
        paid_date: new Date().toISOString().split('T')[0],
        amount: 380000, // Remaining balance
        payer_name: 'John Doe Test',
      }

      await receiptApi.create(fullPaymentReceipt)

      // Wait for triggers to process
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const settledAgreement = await saleAgreementApi.getById(testData.agreementId)
      expect(settledAgreement.status).toBe('settled')
      expect(settledAgreement.balance_due).toBe(0)
    })
  })

  describe('Step 10: Error Handling', () => {
    it('should handle invalid UUIDs gracefully', async () => {
      await expect(clientApi.getById('invalid-uuid')).rejects.toThrow()
    })

    it('should handle missing records gracefully', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000'
      const result = await clientApi.getById(nonExistentId)
      expect(result).toBeNull()
    })

    it('should validate required fields', async () => {
      const incompleteData = {
        full_name: 'Test User',
        // Missing required fields
      }

      await expect(clientApi.create(incompleteData as any)).rejects.toThrow()
    })
  })
})

// Performance tests
describe('Performance Tests', () => {
  it('should handle bulk operations efficiently', async () => {
    const startTime = Date.now()

    // Test bulk client creation
    const clients = []
    for (let i = 0; i < 10; i++) {
      clients.push({
        full_name: `Bulk Test Client ${i}`,
        id_number: `BULK${i.toString().padStart(6, '0')}`,
        phone: `+25470${i.toString().padStart(7, '0')}`,
        source: 'bulk_import' as const,
      })
    }

    const createdClients = await Promise.all(clients.map((client) => clientApi.create(client)))

    const endTime = Date.now()
    const duration = endTime - startTime

    expect(createdClients.length).toBe(10)
    expect(duration).toBeLessThan(5000) // Should complete within 5 seconds

    // Cleanup
    await Promise.all(
      createdClients.map((client) =>
        supabase.from('clients').delete().eq('client_id', client.client_id)
      )
    )
  })

  it('should handle concurrent operations', async () => {
    const concurrentOperations = []

    for (let i = 0; i < 5; i++) {
      concurrentOperations.push(clientApi.getAll({ limit: 10 }))
    }

    const results = await Promise.all(concurrentOperations)

    expect(results.length).toBe(5)
    results.forEach((result) => {
      expect(Array.isArray(result)).toBe(true)
    })
  })
})

// Security tests
describe('Security Tests', () => {
  it('should prevent SQL injection in search queries', async () => {
    const maliciousSearch = "'; DROP TABLE clients; --"

    // This should not throw an error or cause damage
    const result = await clientApi.getAll({ search: maliciousSearch })
    expect(Array.isArray(result)).toBe(true)
  })

  it('should validate input data types', async () => {
    const invalidData = {
      full_name: 123, // Should be string
      id_number: 'VALID123',
      phone: '+254701234567',
      source: 'walk_in' as const,
    }

    await expect(clientApi.create(invalidData as any)).rejects.toThrow()
  })
})
