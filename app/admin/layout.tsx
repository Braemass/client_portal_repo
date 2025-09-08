// app/admin/layout.tsx
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_EMAILS } from '@/lib/site';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies(); // Next 15: cookies() is async in RSC
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;

  if (!isAdminEmail(email)) {
    redirect('/profile');
  }

  return <>{children}</>;
}

