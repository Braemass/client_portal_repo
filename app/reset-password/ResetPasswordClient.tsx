'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// Create a browser Supabase client for this component
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Supabase recovery links include ?code=...
  useEffect(() => {
    const code = sp.get('code');
    (async () => {
      try {
        if (code) {
          // Exchange email link code for a session
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;

          // (Optional) Tell the server to sync cookies
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            await fetch('/auth/callback', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
            });
          }
        } else {
          // No code found in URL
          setErr('This reset link is missing or expired. Please request a new one.');
        }
      } catch (e: any) {
        setErr(e?.message || 'Invalid or expired reset link.');
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (pw1.length < 8) return setErr('Password must be at least 8 characters.');
    if (pw1 !== pw2) return setErr('Passwords do not match.');

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;

      // Go to profile after success
      router.replace('/profile');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to set your new password.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div className="mt-6 text-slate-400">Validating link…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {err && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-rose-200">
          {err}
        </div>
      )}

      <label className="block text-sm">
        <span className="text-white/80">New password</span>
        <input
          type="password"
          required
          minLength={8}
          value={pw1}
          onChange={(e) => setPw1(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none ring-emerald-400/30 placeholder:text-white/30 focus:ring-4"
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </label>

      <label className="block text-sm">
        <span className="text-white/80">Confirm password</span>
        <input
          type="password"
          required
          minLength={8}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none ring-emerald-400/30 placeholder:text-white/30 focus:ring-4"
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-emerald-400/90 px-4 py-2.5 font-medium text-slate-900 shadow hover:opacity-90 disabled:opacity-60"
      >
        {busy ? 'Updating…' : 'Save new password'}
      </button>

      <div className="text-center">
        <a href="/login" className="text-sm text-slate-400 underline hover:text-slate-200">
          Back to login
        </a>
      </div>
    </form>
  );
}

