// app/page.tsx
import { redirect } from 'next/navigation';
import createSupabaseServerClient from '@/lib/supabaseServer';

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) redirect('/profile');
  redirect('/login');
}

