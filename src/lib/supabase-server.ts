import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '../lib/types/database'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  const supabase = createServerComponentClient<Database>({
    cookies: () => cookieStore,
  })

  return supabase
}

export async function getServerUser() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

