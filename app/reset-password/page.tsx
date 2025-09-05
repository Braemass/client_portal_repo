'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const sp = useSearchParams();

  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const code = sp.get('code'); // present for email link flows
    (async () => {
      try {
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        }
      } catch (e: any) {
        setErr(e?.message || 'Invalid or expired link.');
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncServerSession() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await fetch('/auth/callback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'SIGNED_IN', session: data.session }),
      });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (pw1.length < 8) {
      setErr('Password must be at least 8 characters.');
      return;
    }
    if (pw1 !== pw2) {
      setErr('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) {
      setErr(error.message);
    } else {
      await syncServerSession();
      router.replace('/profile');
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0E1B2B] via-[#0a1424] to-[#08101d] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="mb-2 font-display text-3xl">Reset your password</h1>
          <p className="mb-6 text-white/70">
            Enter a new password for your account.
          </p>

          {!ready ? (
            <div>Validating link…</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
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
                />
              </label>

              {err && (
                <div className="rounded-xl border border-red-300/30 bg-red-900/15 p-3 text-sm text-red-200">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-emerald-400/90 px-4 py-2.5 font-medium text-slate-900 shadow hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Updating…' : 'Save new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

