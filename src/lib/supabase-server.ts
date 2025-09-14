import { cookies as nextCookies, headers as nextHeaders } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '../lib/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Standard server client tied to the user's cookies/headers */
export async function getServerSupabase() {
  const cookieStore = await nextCookies()
  const headerList = await nextHeaders()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options?: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options?: CookieOptions) {
        cookieStore.delete({ name, ...options })
      },
    },
    headers: {
      get(name: string) {
        // Useful if you forward custom headers (e.g., x-request-id). Avoid direct Authorization usage.
        return headerList.get(name) ?? undefined
      },
    },
  })
}

/** Privileged server client (service role) for server-only mutations that must bypass RLS */
export function getServiceSupabase() {
  return createAdminClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false },
  })
}

// Legacy function for backward compatibility - will be removed
export async function createServerSupabaseClient() {
  return getServerSupabase()
}

export async function getServerUser() {
  const supabase = await getServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Auth guard helper */
export async function requireUser() {
  const supabase = await getServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null as const, supabase, error: error ?? new Error('Unauthenticated') }
  }
  return { user, supabase, error: null as const }
}
