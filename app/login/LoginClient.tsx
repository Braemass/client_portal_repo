'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Prefill email from invite link: ?email=someone@example.com
  React.useEffect(() => {
    const e = searchParams.get('email');
    if (e) setEmail(e);
  }, [searchParams]);

  async function handleEmailPasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // IMPORTANT: sync server cookies so middleware sees you're logged in
      await fetch('/auth/callback', { method: 'POST' });

      router.replace('/profile');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/profile`,
        },
      });
      if (error) throw error;
      // The browser will navigate to Google; nothing else to do here.
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start Google sign-in');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Client Portal with <span className="text-sky-500">StrandAerial</span>
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        Sign in to view your projects and profile.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailPasswordSignIn} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-200 focus:border-sky-400 focus:ring"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            required
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-sky-200 focus:border-sky-400 focus:ring"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-2.5 font-semibold text-slate-900 shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs uppercase tracking-wider text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.611,20.083H24v7.834h11.303C33.963,32.676,29.441,36,24,36c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.158,7.957,3.043l5.543-5.543C33.554,6.146,28.977,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.86,21.352,43.611,20.083z"/>
          <path fill="#FF3D00" d="M6.306,14.691l6.437,4.719C14.31,16.094,18.855,12,24,12c3.059,0,5.842,1.158,7.957,3.043l5.543-5.543 C33.554,6.146,28.977,4,24,4C16.318,4,9.76,8.352,6.306,14.691z"/>
          <path fill="#4CAF50" d="M24,44c5.356,0,10.229-2.053,13.9-5.411l-6.416-5.426C29.428,34.844,26.861,36,24,36 c-5.408,0-9.946-3.304-11.728-7.966l-6.39,4.927C8.271,39.558,15.536,44,24,44z"/>
          <path fill="#1976D2" d="M43.611,20.083H24v7.834h11.303c-1.334,3.759-4.871,6.581-9.303,6.581c-5.408,0-9.946-3.304-11.728-7.966 l-6.39,4.927C8.271,39.558,15.536,44,24,44c11.045,0,20-8.955,20-20C44,22.659,43.86,21.352,43.611,20.083z"/>
        </svg>
        Continue with Google
      </button>
    </div>
  );
}

