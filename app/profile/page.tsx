// app/profile/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In Next.js 15, searchParams is a Promise in RSC
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Resolve search params (Next 15)
  const sp = (await searchParams) ?? {};
  const savedParam = Array.isArray(sp.saved) ? sp.saved[0] : sp.saved;
  const saved = savedParam === '1';

  // Next 15: cookies() is async and returns a cookie store
  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // No-ops for set/remove in a server component are fine
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  // Require auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/profile');
  }

  // Load the user's profile (adjust to your schema)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, company')
    .eq('id', user.id)
    .maybeSingle();

  // ---- Server Action (must return void) ----
  async function saveProfile(formData: FormData): Promise<void> {
    'use server';

    const cookieStoreInner = await cookies();
    const supabaseInner = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStoreInner.get(name)?.value;
        },
        set(_n: string, _v: string, _o: CookieOptions) {},
        remove(_n: string, _o: CookieOptions) {},
      },
    });

    const {
      data: { user: u },
    } = await supabaseInner.auth.getUser();

    if (!u) {
      redirect('/login?next=/profile');
    }

    const full_name = String(formData.get('full_name') ?? '').trim();
    const phone = String(formData.get('phone') ?? '').trim();
    const company = String(formData.get('company') ?? '').trim();

    await supabaseInner.from('profiles').upsert(
      {
        id: u!.id,
        email: u!.email, // source of truth
        full_name,
        phone,
        company,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    // Redirect back with a flag (server actions must return void)
    redirect('/profile?saved=1');
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      {saved && (
        <div className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900 px-4 py-3">
          Profile saved successfully.
        </div>
      )}

      <h1 className="text-2xl font-semibold mb-6">Your profile</h1>

      <form action={saveProfile} className="grid gap-4">
        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Email</span>
          <input
            className="border rounded px-3 py-2"
            name="email"
            defaultValue={user.email ?? ''}
            readOnly
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Full name</span>
          <input
            className="border rounded px-3 py-2"
            name="full_name"
            defaultValue={profile?.full_name ?? ''}
            placeholder="Your name"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Phone</span>
          <input
            className="border rounded px-3 py-2"
            name="phone"
            defaultValue={profile?.phone ?? ''}
            placeholder="(555) 123-4567"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-gray-600">Company</span>
          <input
            className="border rounded px-3 py-2"
            name="company"
            defaultValue={profile?.company ?? ''}
            placeholder="Company name"
          />
        </label>

        <div className="mt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-900 hover:bg-sky-400"
          >
            Save changes
          </button>
        </div>
      </form>
    </main>
  );
}

