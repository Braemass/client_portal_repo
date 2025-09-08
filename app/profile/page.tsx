// app/profile/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { saveProfile } from './actions';

export const runtime = 'nodejs';

export default async function ProfilePage() {
  const cookieStore = await cookies();
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/profile');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  async function action(formData: FormData) {
    'use server';
    return await saveProfile(formData);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-4">Your profile</h1>

        <form action={action} className="grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Email</span>
            <input className="border rounded px-3 py-2" name="email" defaultValue={user.email ?? ''} readOnly />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Full name</span>
            <input className="border rounded px-3 py-2" name="full_name" defaultValue={(profile?.full_name ?? '') as string} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Company</span>
            <input className="border rounded px-3 py-2" name="company" defaultValue={(profile?.company ?? '') as string} />
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-gray-600">Phone</span>
            <input className="border rounded px-3 py-2" name="phone" defaultValue={(profile?.phone ?? '') as string} />
          </label>

          <button className="mt-2 rounded-lg bg-sky-500 text-white px-4 py-2 font-medium hover:bg-sky-600">
            Save
          </button>
        </form>
      </div>
    </div>
  );
}

