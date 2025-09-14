import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
)

export function useSupabaseUser() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let mounted = true

    // Always verify with Auth server:
    supabase.auth.getUser().then(({ data, error }) => {
      if (!mounted) return
      setUser(error ? null : data.user)
      setLoading(false)
    })

    // You can still subscribe to changes, but re-verify when it fires
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getUser()
      if (mounted) setUser(data.user ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription.unsubscribe()
    }
  }, [])

  return { user, loading, supabase }
}
