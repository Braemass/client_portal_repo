// app/profile/actions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function saveProfile(formData: FormData) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) {
    return { ok: false, message: 'Not authenticated' };
  }

  const payload = {
    id: user.id,
    email: user.email,
    full_name: (formData.get('full_name') as string | null) ?? null,
    company: (formData.get('company') as string | null) ?? null,
    phone: (formData.get('phone') as string | null) ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) return { ok: false, message: error.message };

  return { ok: true };
}

