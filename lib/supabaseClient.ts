'use client'

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'

// Keep a single browser client for the whole app
let _client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}

// Convenience export so existing code `import { supabase } ...` still works
export const supabase = getSupabaseBrowser()

