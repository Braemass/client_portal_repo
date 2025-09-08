'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, SITE_URL, isAdminEmail as isAdmin } from '@/lib/site';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // If already signed in, bounce immediately
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      const userEmail = data.session?.user?.email ?? null;
      if (userEmail) {
        router.replace(isAdmin(userEmail) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // (optional) sync cookies for SSR pages
      await fetch('/auth/callback', { method: 'POST' });

      const userEmail = data.user?.email ?? null;
      const dest = isAdmin(userEmail) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;
      router.replace(dest);
    } catch (e: any) {
      setErr(e?.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setErr(null);
    setBusy(true);
    try {
      // Send user to Google -> comes back to /auth/callback, which routes by email
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      // Control will leave this page
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message || 'Google sign-in failed');
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-2 text-xl font-bold">Client Portal with StrandAerial</h1>
      <p className="mb-6 text-sm text-slate-600">Sign in to continue</p>

      <form onSubmit={signInWithEmail} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-900 hover:bg-sky-400 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="my-4 h-px w-full bg-slate-200" />

      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
        aria-label="Sign in with Google"
      >
        <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden>
          <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.3H272v95.1h147.1c-6.3 34-25 62.8-53.3 82v68.2h86.2c50.4-46.5 81.5-115.1 81.5-195z"/>
          <path fill="#34A853" d="M272 544.3c72 0 132.3-23.8 176.4-64.7l-86.2-68.2c-23.9 16.1-54.4 25.7-90.2 25.7-69 0-127.5-46.5-148.4-109.1H35.9v68.9c43.9 87.1 133.6 147.4 236.1 147.4z"/>
          <path fill="#FBBC04" d="M123.6 327.9c-10.1-30.2-10.1-62.7 0-92.9v-68.9H35.9c-38.1 76.2-38.1 154.5 0 230.7l87.7-69z"/>
          <path fill="#EA4335" d="M272 106.1c39.1-.6 76.7 14 105.2 40.9l78.4-78.4C407.9 24.8 344.3.1 272 0 169.6 0 79.9 60.3 36 147.4l87.6 69c20.9-62.6 79.4-110.3 148.4-110.3z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}

