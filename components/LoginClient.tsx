'use client';

import React, { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  ADMIN_EMAILS,
  ADMIN_REDIRECT,
  DEFAULT_USER_REDIRECT,
  SITE_URL,
} from '@/lib/site';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();

  // Client (non-admin) refs
  const userEmailRef = useRef<HTMLInputElement>(null);
  const userPassRef = useRef<HTMLInputElement>(null);

  // Admin refs
  const adminEmailRef = useRef<HTMLInputElement>(null);
  const adminPassRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<'none' | 'user' | 'admin' | 'google' | 'admin-google'>('none');
  const [error, setError] = useState<string | null>(null);

  const nextParam = params.get('next') || '';

  async function syncServerCookies() {
    // Ensures the server sees the new session cookie (critical for "staying signed in")
    await fetch('/auth/callback', { method: 'POST' });
  }

  async function handleEmailPassword(role: 'user' | 'admin') {
    setError(null);
    setLoading(role === 'admin' ? 'admin' : 'user');

    const email =
      role === 'admin' ? adminEmailRef.current?.value : userEmailRef.current?.value;
    const password =
      role === 'admin' ? adminPassRef.current?.value : userPassRef.current?.value;

    if (!email || !password) {
      setError('Please enter your email and password.');
      setLoading('none');
      return;
    }

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) throw signInErr;

      await syncServerCookies();

      // Decide destination
      const desiredNext = nextParam || (role === 'admin' ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT);
      const dest =
        role === 'admin'
          ? isAdminEmail(email)
            ? ADMIN_REDIRECT
            : '/login?error=not_authorized'
          : desiredNext;

      router.replace(dest);
    } catch (e: any) {
      setError(e?.message || 'Failed to sign in.');
    } finally {
      setLoading('none');
    }
  }

  async function handleGoogle(role: 'user' | 'admin') {
    setError(null);
    setLoading(role === 'admin' ? 'admin-google' : 'google');

    // Where to come back to after Google completes
    const fallbackNext = role === 'admin' ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;
    const next = nextParam || fallbackNext;

    const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });

    if (oauthErr) {
      setError(oauthErr.message);
      setLoading('none');
    }
    // On success, browser leaves this page for Google → will return to /auth/callback
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-[#0b2239]">
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-2 p-6">
        {/* CLIENT SIGN IN */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-semibold text-[#0b2239]">Client sign in</h2>
          <p className="text-sm text-slate-600 mt-1">
            Sign in to view and edit your profile and see your projects.
          </p>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleEmailPassword('user');
            }}
          >
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Email</span>
              <input
                ref={userEmailRef}
                type="email"
                className="border rounded px-3 py-2"
                placeholder="you@example.com"
                required
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Password</span>
              <input
                ref={userPassRef}
                type="password"
                className="border rounded px-3 py-2"
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading === 'user'}
              className="inline-flex items-center justify-center rounded-lg bg-sky-400 text-[#0b2239] font-semibold px-4 py-2 hover:bg-sky-300 transition"
            >
              {loading === 'user' ? 'Signing in…' : 'Sign in'}
            </button>

            <button
              type="button"
              disabled={loading === 'google'}
              onClick={() => void handleGoogle('user')}
              className="inline-flex items-center justify-center rounded-lg bg-white border px-4 py-2 hover:bg-slate-50 transition"
            >
              {loading === 'google' ? 'Opening Google…' : 'Continue with Google'}
            </button>

            <a
              href="/reset-password"
              className="text-sm text-sky-600 hover:underline justify-self-start"
            >
              Forgot password?
            </a>
          </form>
        </div>

        {/* ADMIN SIGN IN */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-md">
          <h2 className="text-xl font-semibold text-[#0b2239]">Admin sign in</h2>
          <p className="text-sm text-slate-600 mt-1">
            Admins can manage clients, projects, and assets.
          </p>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleEmailPassword('admin');
            }}
          >
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Admin email</span>
              <input
                ref={adminEmailRef}
                type="email"
                className="border rounded px-3 py-2"
                placeholder="admin@strand.com"
                required
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-slate-600">Password</span>
              <input
                ref={adminPassRef}
                type="password"
                className="border rounded px-3 py-2"
                placeholder="••••••••"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading === 'admin'}
              className="inline-flex items-center justify-center rounded-lg bg-amber-300 text-[#0b2239] font-semibold px-4 py-2 hover:bg-amber-200 transition"
            >
              {loading === 'admin' ? 'Signing in…' : 'Admin sign in'}
            </button>

            <button
              type="button"
              disabled={loading === 'admin-google'}
              onClick={() => void handleGoogle('admin')}
              className="inline-flex items-center justify-center rounded-lg bg-white border px-4 py-2 hover:bg-slate-50 transition"
            >
              {loading === 'admin-google' ? 'Opening Google…' : 'Admin – Continue with Google'}
            </button>
          </form>
        </div>

        {error && (
          <div className="md:col-span-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

