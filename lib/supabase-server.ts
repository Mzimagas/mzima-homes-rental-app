import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function getServerSupabase() {
  const cookieStore = cookies()
  const headerList = headers()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
      headers: {
        // Forward the auth header if present (important for RLS)
        Authorization: headerList.get('Authorization') ?? undefined,
      },
    }
  )
}

/** Auth guard helper */
export async function requireUser() {
  const supabase = getServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null as const, supabase, error: error ?? new Error('Unauthenticated') }
  }
  return { user, supabase, error: null as const }
}
