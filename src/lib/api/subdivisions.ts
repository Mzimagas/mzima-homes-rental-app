/**
 * Subdivisions API module for managing subdivision and plot operations
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types
export interface Plot {
  plot_id: string
  subdivision_id: string
  plot_no: string
  size_sqm: number
  size_acres: number
  stage: string
  access_type: string
  utility_level: string
  corner_plot: boolean
  premium_location: boolean
  frontage_meters: number
  created_at: string
  updated_at: string
}

export interface Subdivision {
  subdivision_id: string
  parcel_id: string
  name: string
  status: string
  total_plots_planned: number
  total_plots_created: number
  created_at: string
  updated_at: string
}

// Plot API
export const plotApi = {
  async create(plotData: Omit<Plot, 'plot_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('plots').insert(plotData).select().single()

    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('plots')
      .select(
        `
        *,
        subdivisions!inner(
          subdivision_id,
          name,
          status
        )
      `
      )
      .order('plot_no', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getBySubdivision(subdivisionId: string) {
    const { data, error } = await supabase
      .from('plots')
      .select(
        `
        *,
        subdivisions!inner(
          subdivision_id,
          name,
          status
        )
      `
      )
      .eq('subdivision_id', subdivisionId)
      .order('plot_no', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getById(plotId: string) {
    const { data, error } = await supabase
      .from('plots')
      .select(
        `
        *,
        subdivisions!inner(
          subdivision_id,
          name,
          status
        )
      `
      )
      .eq('plot_id', plotId)
      .single()

    if (error) throw error
    return data
  },

  async update(plotId: string, updates: Partial<Plot>) {
    const { data, error } = await supabase
      .from('plots')
      .update(updates)
      .eq('plot_id', plotId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(plotId: string) {
    const { error } = await supabase.from('plots').delete().eq('plot_id', plotId)

    if (error) throw error
  },

  async batchCreate(plots: Omit<Plot, 'plot_id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase.from('plots').insert(plots).select()

    if (error) throw error
    return data || []
  },

  async getAvailable() {
    const { data, error } = await supabase
      .from('plots')
      .select(
        `
        *,
        subdivisions!inner(
          subdivision_id,
          name,
          status
        )
      `
      )
      .eq('stage', 'AVAILABLE')
      .order('plot_no', { ascending: true })

    if (error) throw error
    return data || []
  },

  async updateStage(plotId: string, stage: string) {
    const { data, error } = await supabase
      .from('plots')
      .update({ stage })
      .eq('plot_id', plotId)
      .select()
      .single()

    if (error) throw error
    return data
  },
}

// Subdivision API
export const subdivisionApi = {
  async create(subdivisionData: Omit<Subdivision, 'subdivision_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('subdivisions')
      .insert(subdivisionData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAll() {
    const { data, error } = await supabase
      .from('subdivisions')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getById(subdivisionId: string) {
    const { data, error } = await supabase
      .from('subdivisions')
      .select('*')
      .eq('subdivision_id', subdivisionId)
      .single()

    if (error) throw error
    return data
  },

  async update(subdivisionId: string, updates: Partial<Subdivision>) {
    const { data, error } = await supabase
      .from('subdivisions')
      .update(updates)
      .eq('subdivision_id', subdivisionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async delete(subdivisionId: string) {
    const { error } = await supabase
      .from('subdivisions')
      .delete()
      .eq('subdivision_id', subdivisionId)

    if (error) throw error
  },

  async getByParcel(parcelId: string) {
    const { data, error } = await supabase
      .from('subdivisions')
      .select('*')
      .eq('parcel_id', parcelId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async updateStatus(subdivisionId: string, status: string) {
    const { data, error } = await supabase
      .from('subdivisions')
      .update({ status })
      .eq('subdivision_id', subdivisionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getStats(subdivisionId: string) {
    const { data, error } = await supabase.rpc('get_subdivision_stats', {
      subdivision_id: subdivisionId,
    })

    if (error) throw error
    return data
  },
}
