// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type ProjectRow = {
  id: string;
  title: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default function AdminDashboard() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,status,created_at')
        .order('created_at', { ascending: false });

      if (!cancelled) {
        if (error) setErr(error.message);
        setRows(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>

      {err && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl border bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center">
          <p className="text-sm text-gray-600">No projects yet.</p>
          <div className="mt-4">
            <Link
              href="/admin/projects/new"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
            >
              Create project
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl border bg-white p-4 flex items-center justify-between"
            >
              <div>
                <Link className="font-medium hover:underline" href={`/admin/projects/${p.id}`}>
                  {p.title || 'Untitled Project'}
                </Link>
                {p.status && (
                  <div className="text-xs text-gray-500 mt-1">Status: {p.status}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/projects/${p.id}/upload`}
                  className="rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm"
                >
                  Upload
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

