'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Project = { id: string; title: string | null; created_at?: string | null };

export default function ProjectsIndex() {
  const [email, setEmail] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // Load current session email (no auth-helpers-react needed)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    })();
  }, []);

  // Fetch projects list
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,created_at')
        .order('created_at', { ascending: false });

      if (error) setErr(error.message);
      setProjects((data ?? []) as Project[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="font-display text-3xl">Projects</h1>
        <p className="text-sm text-black/60 dark:text-white/70">
          {email ? <>Signed in as <strong>{email}</strong></> : 'Not signed in'}
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded-xl border bg-red-50 p-3 text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border bg-white p-4">Loading…</div>
      ) : projects.length === 0 ? (
        <p className="text-black/70 dark:text-white/70">No projects yet.</p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div>
                <div className="font-medium">{p.title ?? p.id}</div>
                {p.created_at && (
                  <div className="text-sm text-black/60 dark:text-white/60">
                    Created {new Date(p.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <Link
                href={`/projects/${p.id}`}
                className="rounded-md bg-brand-teal px-3 py-1 text-sm text-white hover:opacity-90"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

