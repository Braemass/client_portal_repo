// components/UserBarServer.tsx
import createSupabaseServerClient from '@/lib/supabaseServer';
import UserBar from './UserBar';

export default async function UserBarServer() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user?.email ?? null;
  const avatar = data.session?.user?.user_metadata?.avatar_url ?? null;

  return <UserBar initialEmail={email} initialAvatarUrl={avatar} />;
}

