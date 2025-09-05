'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

type Mode = 'signin' | 'signup';

/** --- Inner component uses useSearchParams --- */
function LoginInner() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qp = useSearchParams();

  // read query params
  const invitedEmail = qp.get('email') ?? '';
  const initialMode: Mode = (qp.get('mode') as Mode) === 'signup' ? 'signup' : 'signin';
  const next = qp.get('next') || '/projects';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setEmail(invitedEmail), [invitedEmail]);

  const title = useMemo(
    () => (mode === 'signup' ? 'Create your account' : 'Sign in'),
    [mode]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else {
        if (data.session) router.replace(next);
        else setError('Check your email to confirm your account, then sign in.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else if (data.session) router.replace(next);
    }
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0E1B2B] via-[#0a1424] to-[#08101d] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-6">
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur md:grid-cols-2">
          {/* Left: brand / hero */}
          <div className="relative hidden items-center justify-center p-10 md:flex">
            <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-brand-teal/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative z-10 space-y-4">
              <h1 className="font-display text-4xl leading-tight">
                Welcome to <span className="text-brand-teal">StrandAerial</span>
              </h1>
              <p className="max-w-sm text-white/70">
                Secure portal for your aerial deliverables—projects, invoices, and updates
                in one place.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/70">
                <li>• Encrypted sessions with Supabase</li>
                <li>• Client-specific access to projects</li>
                <li>• Update your profile anytime</li>
              </ul>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white p-8 text-black dark:bg-[#0B1727] dark:text-white">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">{title}</h2>
                {invitedEmail && mode === 'signup' && (
                  <p className="mt-1 text-sm text-black/60 dark:text-white/70">
                    You were invited as <strong>{invitedEmail}</strong>.
                  </p>
                )}
              </div>

              <div className="inline-flex rounded-xl border border-black/10 p-1 dark:border-white/15">
                <button
                  onClick={() => setMode('signin')}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    mode === 'signin'
                      ? 'bg-brand-teal text-white'
                      : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    mode === 'signup'
                      ? 'bg-brand-teal text-white'
                      : 'text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
                >
                  Create
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none ring-brand-teal/30 focus:ring-4 dark:border-white/15 dark:bg-[#0E1B2B]"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm">
                {mode === 'signup' ? 'Create password' : 'Password'}
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 outline-none ring-brand-teal/30 focus:ring-4 dark:border-white/15 dark:bg-[#0E1B2B]"
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand-teal px-4 py-2.5 text-white shadow hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>

              {mode === 'signin' && (
                <button
                  type="button"
                  className="w-full rounded-xl border px-4 py-2 text-sm text-black/70 hover:bg-black/5 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10"
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOtp({
                      email,
                      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                    });
                    if (error) setError(error.message);
                    else setError('Magic link sent. Check your email.');
                  }}
                >
                  Use magic link instead
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

/** --- Page exports a Suspense wrapper so Next 15 is happy --- */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#0a1424] text-white">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 opacity-80">
            Loading…
          </div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

