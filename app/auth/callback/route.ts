import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import createSupabaseServerClient from '@/lib/supabaseServer';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const store = await cookies();
  const returnTo = store.get('return_to')?.value;

  return NextResponse.redirect(new URL(returnTo || '/admin', url));
}

