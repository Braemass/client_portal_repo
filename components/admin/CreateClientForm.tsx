'use client';

import { useState } from 'react';

export default function CreateClientForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create client');
      setMsg('Client created and invited successfully.');
      setEmail('');
      setFullName('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 max-w-lg">
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Client email</span>
        <input
          className="border rounded px-3 py-2"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@example.com"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-slate-600">Full name (optional)</span>
        <input
          className="border rounded px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Client"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-white font-medium hover:bg-sky-700 disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create client'}
      </button>
      {msg && <div className="text-sm text-emerald-700">{msg}</div>}
      {err && <div className="text-sm text-rose-700">{err}</div>}
    </form>
  );
}

