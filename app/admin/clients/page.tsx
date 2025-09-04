// app/admin/clients/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Client = {
  id: string;
  name: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

const SOURCE = (process.env.NEXT_PUBLIC_CLIENTS_SOURCE || 'auto').trim() as
  | 'auto'
  | 'clients'
  | 'profiles';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function fromClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id,name,company,email,phone,created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data || []) as Client[];
    }

    async function fromProfiles() {
      const { data, error } = await supabase.from('profiles').select('*').limit(1000);
      if (error) throw new Error(error.message);
      return (data || []).map((r: any) => ({
        id: r.id,
        name: r.name ?? r.full_name ?? r.username ?? r.email ?? 'User',
        company: r.company ?? r.organization ?? null,
        email: r.email ?? r.primary_email ?? null,
        phone: r.phone ?? r.mobile ?? null,
        created_at: r.created_at ?? null,
      })) as Client[];
    }

    (async () => {
      setLoading(true);
      setErr('');
      try {
        let rows: Client[] = [];
        if (SOURCE === 'clients') rows = await fromClients();
        else if (SOURCE === 'profiles') rows = await fromProfiles();
        else {
          // auto: prefer clients; fall back to profiles — but no banner
          try {
            rows = await fromClients();
            if (rows.length === 0) rows = await fromProfiles();
          } catch {
            rows = await fromProfiles();
          }
        }
        if (!cancelled) setClients(rows);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load clients.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) =>
      [c.name ?? '', c.company ?? '', c.email ?? '', c.phone ?? '', c.id ?? '']
        .join(' ')
        .toLowerCase()
        .includes(t)
    );
  }, [q, clients]);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold">Clients</h1>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-md"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
            Create Client
          </Link>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        <div className="mb-6">
          <input
            className="w-full max-w-xl rounded-lg border px-3 py-2 bg-white"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients by name, company, email, or phone…"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border bg-white shadow-md animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-md">
            <p>No clients yet.</p>
            <div className="mt-3">
              <Link
                href="/admin/clients/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                </svg>
                Create your first client
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/admin/clients/${c.id}`}
                className="group block rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden"
              >
                <div className="p-4">
                  <div className="mb-1 line-clamp-1 text-base font-medium">
                    {c.name || 'Unnamed Client'}
                  </div>
                  <div className="text-xs text-gray-700 line-clamp-1">
                    {c.company || '—'}
                  </div>
                  <div className="mt-1 text-xs text-gray-600 line-clamp-1">
                    {c.email || c.phone || 'No contact on file'}
                  </div>
                </div>
                <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-700">
                  View client →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

