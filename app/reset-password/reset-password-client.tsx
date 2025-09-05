// app/reset-password/reset-password-client.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code'); // Supabase includes ?code=... on recovery links

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  if (!code) {
    return (
      <div className="mt-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-200">
        This reset link is missing a <code className="px-1">code</code> parameter or has expired.
        Please go back to{" "}
        <a href="/login" className="underline">Login</a> and use <b>Forgot password</b> again.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (password.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    if (password !== password2) {
      setErr('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // 1) Exchange the code from the email for a session (browser-only)
      const { error: exErr } = await supabase.auth.exchangeCodeForSession({ code });
      if (exErr) throw exErr;

      // 2) Update the password for the now-authenticated user
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;

      setOk('Password updated. Redirecting to your profile…');
      // Give the toast a tick, then send them to their profile
      setTimeout(() => router.replace('/profile'), 600);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong while setting your password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {err && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">
          {err}
        </div>
      )}
      {ok && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-200">
          {ok}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">New password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 outline-none ring-0 focus:border-sky-500"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Confirm password</span>
        <input
          type="password"
          required
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 outline-none ring-0 focus:border-sky-500"
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {loading ? 'Saving…' : 'Save new password'}
      </button>

      <div className="text-center">
        <a href="/login" className="text-sm text-slate-400 underline hover:text-slate-200">
          Back to login
        </a>
      </div>
    </form>
  );
}

