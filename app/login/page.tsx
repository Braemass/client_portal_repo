'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

type Mode = 'signin' | 'signup';

function LoginInner() {
  const supabase = getSupabaseBrowser();
  const router = useRouter();
  const qp = useSearchParams();

  const invitedEmail = qp.get('email') ?? '';
  const initialMode: Mode = (qp.get('mode') as Mode) === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<Mode>(initialMode);

  const next = qp.get('next') || '/profile';

  const [email, setEmail] = useState(invitedEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setEmail(invitedEmail), [invitedEmail]);

  const title = useMemo(
    () => (mode === 'signup' ? 'Create your password' : 'Sign in'),
    [mode]
  );

  async function syncServerSession(event: 'SIGNED_IN' | 'SIGNED_OUT', session?: any) {
    await fetch('/auth/callback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, session }),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) {
        await syncServerSession('SIGNED_IN', data.session);
        router.replace('/profile');
      } else {
        setError('Check your email to confirm your account, then sign in.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else if (data.session) {
        await syncServerSession('SIGNED_IN', data.session);
        router.replace('/profile');
      }
    }

    setBusy(false);
  }

  async function signInWithGoogle() {
    setError(null);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
      },
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0E1B2B] via-[#0a1424] to-[#08101d] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur md:grid-cols-2">
          {/* Left info panel (restored layout) */}
          <div className="relative flex items-center p-10">
            <div className="space-y-6">
              <div className="text-xs tracking-[0.25em] text-white/50">
                CLIENT PORTAL • STRANDAERIAL
              </div>
              <h1 className="font-display text-5xl leading-tight md:text-5xl">
                Welcome to <span className="text-brand-teal">StrandAerial</span>
              </h1>
              <p className="max-w-sm text-white/70">
                Secure access to your aerial deliverables—projects, invoices, and updates.
              </p>
              <ul className="space-y-2 text-sm text-white/65">
                <li>• Encrypted sessions with Supabase</li>
                <li>• Client-specific project access</li>
                <li>• Update your profile anytime</li>
              </ul>
            </div>
          </div>

          {/* Right form panel */}
          <div className="bg-[#0B1727]/70 p-8">
            <div className="mb-5">
              <h2 className="font-display text-2xl text-white">{title}</h2>
              {invitedEmail && mode === 'signup' && (
                <p className="mt-1 text-sm text-white/60">
                  Invitation for <strong>{invitedEmail}</strong>
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm">
                <span className="text-white/80">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none ring-emerald-400/30 placeholder:text-white/30 focus:ring-4"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block text-sm">
                <span className="text-white/80">
                  {mode === 'signup' ? 'Create password' : 'Password'}
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none ring-emerald-400/30 placeholder:text-white/30 focus:ring-4"
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-300/30 bg-red-900/15 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand-teal px-4 py-2.5 font-medium text-white shadow hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>

              {/* Google sign-in */}
              <button
                type="button"
                onClick={signInWithGoogle}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
              >
                {/* Google G */}
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.6 3.6-5.1 3.6a6 6 0 1 1 0-12c1.7 0 2.9.7 3.6 1.3l2.5-2.4C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6 0 9.2-4.2 9.2-8.1 0-.5-.1-1-.2-1.5H12z"/>
                </svg>
                Sign in with Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen grid place-items-center text-white">Loading…</main>}>
      <LoginInner />
    </Suspense>
  );
}

