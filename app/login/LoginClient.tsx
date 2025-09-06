'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { isAdmin, DEFAULT_USER_REDIRECT, ROUTES, SITE_URL } from '@/lib/site';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginClient({ prefillEmail }: { prefillEmail?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get('next') || DEFAULT_USER_REDIRECT;

  const [email, setEmail] = useState(prefillEmail || params.get('email') || '');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (canceled) return;
      const e = data?.user?.email || null;
      if (e) router.replace(isAdmin(e) ? ROUTES.admin : nextParam);
    });
    return () => { canceled = true; };
  }, [router, nextParam]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Ensure server cookie sync then redirect
      await fetch('/auth/callback', { method: 'POST' });
      const { data } = await supabase.auth.getUser();
      const dest = isAdmin(data.user?.email || '') ? ROUTES.admin : nextParam;

      router.replace(dest);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || 'Sign-in failed');
    } finally {
      setPending(false);
    }
  };

  const onGoogle = async () => {
    setPending(true);
    setErr(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(nextParam)}`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setPending(false);
      setErr(e?.message || 'Google sign-in failed');
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-lg backdrop-blur">
      <h1 className="mb-2 text-xl font-semibold text-slate-900">Client Portal • StrandAerial</h1>
      <form onSubmit={onSignIn} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-lg bg-sky-400 px-4 py-2 font-semibold text-slate-900 hover:bg-sky-300 disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={onGoogle}
        disabled={pending}
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        Continue with Google
      </button>

      <div className="mt-4 text-right">
        <a href="/forgot-password" className="text-sm font-medium text-sky-600 hover:text-sky-500">
          Forgot password?
        </a>
      </div>
    </div>
  );
}

