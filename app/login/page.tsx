'use client';
export const dynamic = 'force-dynamic'; // don't prerender this page

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

export default function LoginPage() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) setMsg(error.message);
    else setMsg('Check your email for the magic link.');
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 font-display text-3xl">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4 shadow">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand-teal px-3 py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
        {msg && <p className="text-sm text-black/70">{msg}</p>}
      </form>
    </main>
  );
}

