import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    // Use your SSR Supabase client (writes session cookies via next/headers)
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Optional: honor a return_to cookie if you set one earlier
  const store = await cookies();
  const returnTo = store.get('return_to')?.value;

  // Redirect after login
  return NextResponse.redirect(new URL(returnTo || '/admin', url));
}

