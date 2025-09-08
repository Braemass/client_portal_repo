'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// if you already have a browser client helper, import that instead
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const brandBtn =
  'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold shadow ' +
  'bg-sky-500 text-slate-900 hover:bg-sky-400 active:bg-sky-300 transition';

const outlineBtn =
  'w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold ' +
  'border border-white/15 text-slate-100 hover:bg-white/5 transition';

export default function LoginClient() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function syncServerSession() {
    // Let the server set/mirror auth cookies for SSR
    await fetch('/auth/callback', { method: 'POST', credentials: 'include' });
  }

  const doPasswordLogin = (nextHref: '/profile' | '/admin') =>
    start(async () => {
      setErr(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        return;
      }
      await syncServerSession();

      // If user clicked Admin Login but isn't an admin, middleware will bounce them off /admin.
      router.replace(nextHref);
    });

  const doGoogle = (nextHref: '/profile' | '/admin') =>
    start(async () => {
      setErr(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextHref
          )}`,
        },
      });
      if (error) setErr(error.message);
      // Browser will navigate to Google; no router call here.
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doPasswordLogin('/profile');
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label className="block text-sm text-slate-200">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-slate-200">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-3 py-2 text-slate-100 outline-none focus:border-sky-500"
        />
      </div>

      {err && (
        <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-700/30 rounded-md px-3 py-2">
          {err}
        </p>
      )}

      {/* Primary: normal client login -> /profile */}
      <button type="submit" disabled={pending} className={brandBtn}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      {/* Admin login button -> /admin */}
      <button
        type="button"
        disabled={pending}
        className={outlineBtn}
        onClick={() => doPasswordLogin('/admin')}
      >
        {pending ? 'Checking…' : 'Admin login'}
      </button>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-transparent px-2 text-xs text-slate-400">or</span>
        </div>
      </div>

      {/* Google sign-in buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          className={outlineBtn}
          onClick={() => doGoogle('/profile')}
        >
          Continue with Google
        </button>
        <button
          type="button"
          disabled={pending}
          className={outlineBtn}
          onClick={() => doGoogle('/admin')}
          title="Admins only — non-admins will be redirected away"
        >
          Admin with Google
        </button>
      </div>

      <div className="flex justify-between text-sm pt-1">
        <a href="/reset-password" className="text-slate-300 hover:text-sky-400 underline-offset-4 hover:underline">
          Forgot password?
        </a>
        <a href="/" className="text-slate-400 hover:text-sky-400">Back to home</a>
      </div>
    </form>
  );
}

