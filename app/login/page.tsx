// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { SITE_URL, ROUTES, isAdminEmail } from '@/lib/site';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'user' | 'admin' | 'googleUser' | 'googleAdmin' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function syncSession(next?: string) {
    const { data: s } = await supabase.auth.getSession();
    await fetch(ROUTES.callback, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'SIGNED_IN', session: s.session, next }),
    }).then(res => res.json()).then((r) => {
      if (r?.next) {
        router.replace(r.next);
      }
    });
    router.refresh(); // ensures the header/UserBarServer shows logged-in state
  }

  // ---------- Email/password ----------
  async function signInWithPassword(asAdmin: boolean) {
    setBusy(asAdmin ? 'admin' : 'user');
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }

    const target = asAdmin
      ? (isAdminEmail(email) ? ROUTES.admin : ROUTES.profile)
      : ROUTES.profile;

    await syncSession(target);
    setBusy(null);
  }

  // ---------- Google (kept for convenience) ----------
  async function signInGoogle(asAdmin: boolean) {
    setBusy(asAdmin ? 'googleAdmin' : 'googleUser');
    setError(null);

    const next = asAdmin ? ROUTES.admin : ROUTES.profile;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${SITE_URL}${ROUTES.callback}?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    if (data?.url) window.location.href = data.url;
  }

  async function forgotPassword() {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}${ROUTES.resetPassword}`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    alert('Check your email for a password reset link.');
  }

  return (
    <div className="min-h-screen bg-[#0b2239] text-white flex items-center">
      <div className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-6">
        {/* Left panel */}
        <div className="rounded-2xl p-8 bg-white/5 border border-white/10">
          <p className="uppercase tracking-[.2em] text-xs text-cyan-300/80">
            Client Portal • StrandAerial
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome to StrandAerial</h1>
          <ul className="mt-6 space-y-2 text-sm text-white/80 list-disc list-inside">
            <li>Encrypted sessions with Supabase</li>
            <li>Client-specific project access</li>
            <li>Update profile anytime</li>
          </ul>
        </div>

        {/* Right panel */}
        <div className="rounded-2xl p-8 bg-white text-gray-900 shadow">
          <h2 className="text-lg font-semibold mb-4">Sign in</h2>

          {/* Email / Password */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                className="w-full h-11 rounded-lg border px-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                className="w-full h-11 rounded-lg border px-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => signInWithPassword(false)}
                disabled={!!busy}
                className="h-11 rounded-lg bg-sky-500 text-white font-medium hover:bg-sky-600 transition"
              >
                {busy === 'user' ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                onClick={() => signInWithPassword(true)}
                disabled={!!busy}
                className="h-11 rounded-lg bg-gray-900 text-white font-medium hover:bg-black transition"
                title="Admins will be sent to the admin panel"
              >
                {busy === 'admin' ? 'Checking…' : 'Admin sign in'}
              </button>
            </div>

            <button
              onClick={forgotPassword}
              className="text-sm text-sky-600 hover:underline text-left"
            >
              Forgot password?
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
            <div className="flex-1 h-px bg-gray-200" />
            OR
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google options */}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={() => signInGoogle(false)}
              disabled={!!busy}
              className="h-11 rounded-lg border font-medium hover:bg-gray-50 transition"
            >
              {busy === 'googleUser' ? 'Redirecting…' : 'Sign in with Google'}
            </button>
            <button
              onClick={() => signInGoogle(true)}
              disabled={!!busy}
              className="h-11 rounded-lg border font-medium hover:bg-gray-50 transition"
            >
              {busy === 'googleAdmin' ? 'Redirecting…' : 'Admin with Google'}
            </button>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

