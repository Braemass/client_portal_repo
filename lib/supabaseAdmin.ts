// lib/supabaseAdmin.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * Do NOT import this in any client-side code.
 */
export function createSupabaseAdmin(): SupabaseClient {
  // URL can be public; prefer SUPABASE_URL, fall back to NEXT_PUBLIC_SUPABASE_URL
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // server secret

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default createSupabaseAdmin;

