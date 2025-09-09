import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '../lib/types/database'

// Call this INSIDE a route handler or server component
export async function createServerSupabaseClient() {
  const cookieStore = await cookies() // <-- important: await!

  return createServerClient<Database>(
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
          // clearing = set empty value + expiry in the past
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

export async function getServerUser() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
