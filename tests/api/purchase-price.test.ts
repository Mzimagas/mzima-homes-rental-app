import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock middleware to no-op wrappers
vi.mock('../../src/lib/api/middleware', () => ({
  compose: (..._mws: any[]) => (handler: any) => handler,
  withAuth: (h: any) => h,
  withCsrf: (h: any) => h,
  withRateLimit: (h: any) => h,
}))

// Mock supabase server client to resolve a user id from cookies
vi.mock('../../src/lib/supabase-server', () => ({
  createServerSupabaseClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } } })
    }
  })
}))

// Simple in-memory store to simulate DB
const db = {
  properties: new Map<string, any>(),
  history: [] as any[],
  profiles: new Map<string, any>(),
}

// Helper to reset DB between tests
function resetDb() {
  db.properties.clear()
  db.history = []
  db.profiles.clear()
  db.profiles.set('user-1', { full_name: 'Test Owner', email: 'owner@example.com' })
}

// Mock @supabase/supabase-js createClient (service/admin)
vi.mock('@supabase/supabase-js', () => {
  function createClient(_url: string, _key: string) {
    return {
      rpc: vi.fn(),
      from(table: string) {
        const ctx: any = { table, filters: [] as any[] }
        return {
          select: vi.fn((cols?: string) => {
            ctx.select = cols
            return this
          }),
          order: vi.fn(() => this),
          eq: vi.fn((col: string, val: any) => {
            ctx.filters.push({ col, val })
            return this
          }),
          single: vi.fn(async () => {
            if (table === 'properties') {
              const id = ctx.filters.find((f: any) => f.col === 'id')?.val
              const row = db.properties.get(id)
              if (!row) return { data: null, error: { message: 'not found' } }
              return { data: row, error: null }
            }
            if (table === 'profiles') {
              const id = ctx.filters.find((f: any) => f.col === 'id')?.val
              const row = db.profiles.get(id)
              if (!row) return { data: null, error: { message: 'not found' } }
              return { data: row, error: null }
            }
            return { data: null, error: null }
          }),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          update: vi.fn((patch: any) => {
            ctx.patch = patch
            return {
              eq: (col: string, val: any) => {
                ctx.filters.push({ col, val })
                return {
                  select: (_sel: string) => ({
                    single: async () => {
                      if (table === 'properties') {
                        const id = ctx.filters.find((f: any) => f.col === 'id')?.val
                        const row = db.properties.get(id)
                        if (!row) return { data: null, error: { message: 'not found' } }
                        const updated = { ...row, ...patch }
                        db.properties.set(id, updated)
                        return { data: updated, error: null }
                      }
                      return { data: null, error: null }
                    }
                  })
                }
              }
            }
          }),
          insert: vi.fn(async (payload: any) => {
            if (table === 'property_purchase_price_history') {
              const row = Array.isArray(payload) ? payload[0] : payload
              db.history.push({ id: `${db.history.length + 1}`, ...row, changed_at: new Date().toISOString() })
              return { data: null, error: null }
            }
            return { data: null, error: null }
          }),
        }
      },
    }
  }
  return { createClient }
})

// Import after mocks
import { PATCH as PatchPurchasePrice } from '../../src/app/api/properties/[id]/purchase-price/route'
import { GET as GetHistory } from '../../src/app/api/properties/[id]/purchase-price/history/route'

function makeReq(url: string, method: string, body?: any, headers: Record<string,string> = {}) {
  return {
    nextUrl: { pathname: new URL(url).pathname },
    url,
    headers: new Headers(headers),
    json: async () => body ?? {},
  } as any
}

describe('Purchase Price API', () => {
  beforeEach(() => resetDb())

  it('creates history on initial set (no reason required)', async () => {
    const propertyId = 'prop-1'
    db.properties.set(propertyId, { id: propertyId, name: 'Test', purchase_price_agreement_kes: null })

    const req = makeReq(`http://localhost/api/properties/${propertyId}/purchase-price`, 'PATCH', {
      purchase_price_agreement_kes: 5000000,
    }, { 'x-csrf-token': 'test' })

    const res = await PatchPurchasePrice(req as any)
    expect(res.status).toBe(200)

    // Verify history created
    expect(db.history.length).toBe(1)
    expect(db.history[0]).toMatchObject({
      property_id: propertyId,
      previous_price_kes: null,
      new_price_kes: 5000000,
      change_reason: 'Initial purchase price entry',
      changed_by: 'user-1',
    })

    // Verify property updated
    const updated = db.properties.get(propertyId)
    expect(updated.purchase_price_agreement_kes).toBe(5000000)
  })

  it('requires change_reason for edits and records history', async () => {
    const propertyId = 'prop-2'
    db.properties.set(propertyId, { id: propertyId, name: 'Test', purchase_price_agreement_kes: 5000000 })

    // Missing reason should 400
    const badReq = makeReq(`http://localhost/api/properties/${propertyId}/purchase-price`, 'PATCH', {
      purchase_price_agreement_kes: 5500000,
    }, { 'x-csrf-token': 'test' })
    const badRes = await PatchPurchasePrice(badReq as any)
    expect(badRes.status).toBe(400)

    // With reason should succeed
    const goodReq = makeReq(`http://localhost/api/properties/${propertyId}/purchase-price`, 'PATCH', {
      purchase_price_agreement_kes: 5500000,
      change_reason: 'Market adjustment to reflect updated valuation'
    }, { 'x-csrf-token': 'test' })
    const goodRes = await PatchPurchasePrice(goodReq as any)
    expect(goodRes.status).toBe(200)

    // Verify history appended
    expect(db.history.length).toBe(1)
    expect(db.history[0]).toMatchObject({
      property_id: propertyId,
      previous_price_kes: 5000000,
      new_price_kes: 5500000,
      change_reason: 'Market adjustment to reflect updated valuation',
      changed_by: 'user-1',
    })
  })

  it('GET history returns history entries for property owner', async () => {
    const propertyId = 'prop-3'
    // For GET route, it checks landlord_id via select from properties
    // Seed property table with landlord_id matching current user
    db.properties.set(propertyId, { id: propertyId, landlord_id: 'user-1' })
    // Seed history rows
    db.history.push({ id: 'h1', property_id: propertyId, previous_price_kes: null, new_price_kes: 5000000, change_reason: 'Initial', changed_by: 'user-1', changed_by_name: 'Test Owner', changed_at: new Date().toISOString() })
    db.history.push({ id: 'h2', property_id: propertyId, previous_price_kes: 5000000, new_price_kes: 5500000, change_reason: 'Update', changed_by: 'user-1', changed_by_name: 'Test Owner', changed_at: new Date().toISOString() })

    // Mock admin client .from('properties').select('id, landlord_id') and .from('property_purchase_price_history').select(...).eq(...).order(...)
    // Our mocked createClient.from supports select/eq/order, and the GET route uses .single() for property and not for history
    // We extend the mock behavior for history select here by monkey patching createClient for this test only
    const { createClient } = await import('@supabase/supabase-js') as any
    const admin = createClient('url', 'key')
    admin.from = (table: string) => {
      const ctx: any = { table, filters: [] as any[] }
      return {
        select: (cols?: string) => { ctx.select = cols; return this },
        eq: (col: string, val: any) => { ctx.filters.push({ col, val }); return this },
        order: (_col: string, _opts: any) => this,
        single: async () => {
          if (table === 'properties') {
            const id = ctx.filters.find((f: any) => f.col === 'id')?.val
            const row = db.properties.get(id)
            return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } }
          }
          return { data: null, error: null }
        },
        then: undefined as any, // prevent awaiting
        // Simulate the select returning array for history
        async run() {
          if (table === 'property_purchase_price_history') {
            const pid = ctx.filters.find((f: any) => f.col === 'property_id')?.val
            const rows = db.history.filter(h => h.property_id === pid)
            return { data: rows, error: null }
          }
          return { data: null, error: null }
        }
      } as any
    }

    // Build request to GET history
    const req = makeReq(`http://localhost/api/properties/${propertyId}/purchase-price/history`, 'GET', undefined, { 'x-csrf-token': 'test' })
    // Call the route handler; it will use our mocked admin.from queries
    const res = await GetHistory(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success || json.ok).toBeTruthy()
    expect(Array.isArray(json.data)).toBe(true)
  })
})

