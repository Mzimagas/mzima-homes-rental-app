'use client'
import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Prevent multiple GoTrueClient instances:
 * - module-scoped singleton
 * - memoized on globalThis to survive HMR in dev
 */
declare global {
  // eslint-disable-next-line no-var
  var __supabase_browser__: SupabaseClient | undefined
}

export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowser must be called on the client')
  }
  if (!globalThis.__supabase_browser__) {
    globalThis.__supabase_browser__ = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Use a unique storageKey for THIS app/client
        storageKey: 'mzima-homes-auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      // optional headers tagging
      global: { headers: { 'x-client-info': 'mzima-homes-web' } },
    })
  }
  return globalThis.__supabase_browser__
}

// Export singleton instance for backward compatibility (only on client)
export const supabase = typeof window !== 'undefined' ? getSupabaseBrowser() : null
