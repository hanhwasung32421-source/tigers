import { createClient } from '@supabase/supabase-js'

export function getSupabaseAdminClient() {
  const config = useRuntimeConfig()
  const url = process.env.SUPABASE_URL || (config.public.supabaseUrl as string)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || (config.public.supabaseAnonKey as string)
  
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export async function supaInsert(table: string, payload: any) {
  try {
    const supa = getSupabaseAdminClient()
    const { error } = await supa.from(table).insert(payload as any)
    if (error) {
      console.warn('[supabase]', table, error.message)
    }
  } catch (e: any) {
    console.warn('[supabase]', table, e?.message || e)
  }
}

