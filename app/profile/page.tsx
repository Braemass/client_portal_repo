// app/profile/page.tsx
import { redirect } from 'next/navigation';
import createSupabaseServerClient from '@/lib/supabaseServer';
import ProfilePanel from '@/components/ProfilePanel';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) redirect('/login');

  const email = session.user.email!;
  let client: any = null;

  // prefer clients table
  const { data: cRows } = await supabase
    .from('clients')
    .select('id,name,company,email,phone,avatar_url,created_at')
    .eq('email', email)
    .limit(1);
  if (cRows && cRows.length) client = cRows[0];

  // fallback to profiles
  if (!client) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    if (p) {
      client = {
        id: p.id,
        name: p.full_name ?? p.name ?? p.username ?? p.email ?? 'User',
        company: p.company ?? p.organization ?? null,
        email: p.email ?? email,
        phone: p.phone ?? null,
        avatar_url: p.avatar_url ?? null,
        created_at: p.created_at ?? null,
      };
    }
  }

  if (!client) {
    await supabase
      .from('clients')
      .upsert({ email, name: session.user.user_metadata?.full_name ?? null })
      .select()
      .maybeSingle();
    const { data: refetch } = await supabase
      .from('clients')
      .select('id,name,company,email,phone,avatar_url,created_at')
      .eq('email', email)
      .limit(1);
    client = (refetch && refetch[0]) || { id: session.user.id, email };
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('id,title,status,created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">Your Profile</h1>
        <ProfilePanel initialClient={client} initialProjects={projects || []} />
      </div>
    </main>
  );
}

