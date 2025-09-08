// components/admin/CreateClientForm.tsx
'use client';

import { useState } from 'react';

export default function CreateClientForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState(''); // optional
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);

    try {
      const r = await fetch('/api/admin/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // password is optional; omit it to require magic-link
        body: JSON.stringify({ email, full_name: fullName, password: password || undefined }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data?.error || 'request_failed');
      setMsg('Client created and invited successfully.');
      setEmail('');
      setFullName('');
      setPassword('');
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl p-4 bg-white/60 backdrop-blur border border-slate-200">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Client Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="client@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Jane Client"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Temp Password (optional)
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-sky-400"
          placeholder="Leave blank to send magic-link only"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-sky-500 hover:bg-sky-600 text-white font-semibold px-4 py-2 disabled:opacity-50"
      >
        {loading ? 'Creating…' : 'Create Client'}
      </button>

      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-rose-600 text-sm">{err}</p>}
    </form>
  );
}

