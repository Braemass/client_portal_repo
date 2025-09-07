'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { SITE_URL, isAdminEmail } from '@/lib/site';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// keep one browser client for the whole app
let _client: ReturnType<typeof createBrowserClient> | null = null;
function getClient() {
  if (_client) return _client;
  _client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

export default function LoginClient() {
  const supabase = getClient();
  const router = useRouter();
  const params = useSearchParams();

  const prefillEmail = params.get('email') ?? '';
  const [email, setEmail] = React.useState(prefillEmail);
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState<'client' | 'admin' | 'g-client' | 'g-admin' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  async function afterSignIn(next: string, adminMode: boolean) {
    // Optional: nudge server to read latest auth cookies (if you implemented POST /auth/callback)
    fetch('/auth/callback', { method: 'POST' }).catch(() => {});

    // If user clicked Admin Login but is not an admin, show a note and fall back
    if (adminMode && !isAdminEmail(email)) {
      setInfo('Signed in, but this account is not an admin. Redirecting to your profile…');
      next = '/profile';
    }

    router.replace(next);
    router.refresh();
  }

  async function handlePasswordLogin(mode: 'client' | 'admin') {
    setError(null);
    setInfo(null);
    setLoading(mode);

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;

      const next = mode === 'admin' ? '/admin' : '/profile';
      await afterSignIn(next, mode === 'admin');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to sign in.');
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle(mode: 'client' | 'admin') {
    setError(null);
    setInfo(null);
    setLoading(mode === 'admin' ? 'g-admin' : 'g-client');

    const next = mode === 'admin' ? '/admin' : '/profile';
    // Important: pass redirectTo with "next" so the server callback can route properly
    await getClient().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    // The browser will leave the page for Google; no finally{} needed
  }

  return (
    <div className="space-y-6">
      {/* email + password */}
      <div className="space-y-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-200">Email</span>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-slate-200">Password</span>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handlePasswordLogin('client')}
            disabled={loading !== null}
            className="inline-flex items-center justify-center rounded-lg bg-sky-500 text-slate-900 font-semibold px-4 py-2 hover:bg-sky-400 transition disabled:opacity-60"
          >
            {loading === 'client' ? 'Signing in…' : 'Client Login'}
          </button>

        {/* Admin-only route on success */}
          <button
            onClick={() => handlePasswordLogin('admin')}
            disabled={loading !== null}
            className="inline-flex items-center justify-center rounded-lg bg-amber-400 text-slate-900 font-semibold px-4 py-2 hover:bg-amber-300 transition disabled:opacity-60"
          >
            {loading === 'admin' ? 'Checking admin…' : 'Admin Login'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 text-slate-400">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Google buttons (client vs admin) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleGoogle('client')}
          disabled={loading !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 text-slate-100 px-4 py-2 hover:bg-white/10 transition disabled:opacity-60"
        >
          {loading === 'g-client' ? 'Redirecting…' : (
            <>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M21.35 11.1h-9.17v2.98h5.39c-.23 1.33-1.63 3.9-5.39 3.9-3.25 0-5.9-2.68-5.9-5.98s2.65-5.98 5.9-5.98c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.98 3.7 15.03 2.8 12.18 2.8 6.98 2.8 2.8 6.98 2.8 12.18s4.18 9.38 9.38 9.38c5.41 0 8.97-3.8 8.97-9.15 0-.62-.07-1.09-.17-1.31z"/></svg>
              <span>Sign in with Google</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleGoogle('admin')}
          disabled={loading !== null}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/40 bg-amber-300/10 text-amber-200 px-4 py-2 hover:bg-amber-300/20 transition disabled:opacity-60"
        >
          {loading === 'g-admin' ? 'Checking admin…' : (
            <>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="currentColor" d="M21.35 11.1h-9.17v2.98h5.39c-.23 1.33-1.63 3.9-5.39 3.9-3.25 0-5.9-2.68-5.9-5.98s2.65-5.98 5.9-5.98c1.85 0 3.09.79 3.8 1.47l2.59-2.5C16.98 3.7 15.03 2.8 12.18 2.8 6.98 2.8 2.8 6.98 2.8 12.18s4.18 9.38 9.38 9.38c5.41 0 8.97-3.8 8.97-9.15 0-.62-.07-1.09-.17-1.31z"/></svg>
              <span>Admin Login with Google</span>
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {info && <p className="text-sm text-emerald-300">{info}</p>}

      {/* Help links */}
      <div className="flex items-center justify-between text-sm mt-2">
        <a href="/forgot-password" className="text-sky-400 hover:text-sky-300">Forgot password?</a>
        <a href="/" className="text-slate-400 hover:text-slate-200">Back to site</a>
      </div>
    </div>
  );
}

