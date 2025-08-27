/**
 * Sales API module for managing sales operations
 * This module provides APIs for client management, listings, offers, agreements, and receipts
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types
export interface Client {
  id: string
  full_name: string
  email?: string
  phone: string
  id_number: string
  source: string
  created_at: string
  updated_at: string
}

export interface Listing {
  listing_id: string
  plot_id: string
  price: number
  status: 'ACTIVE' | 'SOLD' | 'RESERVED' | 'WITHDRAWN'
  created_at: string
  updated_at: string
}

export interface OfferReservation {
  id: string
  listing_id: string
  client_id: string
  offer_amount: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  created_at: string
  updated_at: string
}

export interface SaleAgreement {
  sale_agreement_id: string
  listing_id: string
  client_id: string
  price: number
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  created_at: string
  updated_at: string
}

export interface Receipt {
  id: string
  sale_agreement_id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string
  created_at: string
}

// Client API
export const clientApi = {
  async create(clientData: Omit<Client, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('clients').insert(clientData).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Client>) {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) throw error
  },
}

// Listing API
export const listingApi = {
  async create(listingData: Omit<Listing, 'listing_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('listings').insert(listingData).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getActive() {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async updateStatus(listingId: string, status: Listing['status']) {
    const { data, error } = await supabase
      .from('listings')
      .update({ status })
      .eq('listing_id', listingId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Offer/Reservation API
export const offerReservationApi = {
  async create(offerData: Omit<OfferReservation, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('offer_reservations')
      .insert(offerData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getByListing(listingId: string) {
    const { data, error } = await supabase
      .from('offer_reservations')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async updateStatus(id: string, status: OfferReservation['status']) {
    const { data, error } = await supabase
      .from('offer_reservations')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Sale Agreement API
export const saleAgreementApi = {
  async create(
    agreementData: Omit<SaleAgreement, 'sale_agreement_id' | 'created_at' | 'updated_at'>
  ) {
    const { data, error } = await supabase
      .from('sale_agreements')
      .insert(agreementData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('sale_agreements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('sale_agreements')
      .select('*')
      .eq('sale_agreement_id', id)
      .single()

    if (error) throw error
    return data
  },

  async updateStatus(id: string, status: SaleAgreement['status']) {
    const { data, error } = await supabase
      .from('sale_agreements')
      .update({ status })
      .eq('sale_agreement_id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Receipt API
export const receiptApi = {
  async create(receiptData: Omit<Receipt, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('receipts').insert(receiptData).select().single()

    if (error) throw error
    return data
  },

  async getBySaleAgreement(saleAgreementId: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('sale_agreement_id', saleAgreementId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getAll() {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data || []
  },
}
