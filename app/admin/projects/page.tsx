// app/admin/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Project = {
  id: string;
  title: string | null;
  created_at?: string | null;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!cancelled) {
        if (error) setErr(error.message || 'Failed to load projects.');
        else setProjects((data || []) as Project[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Projects</h1>

        {/* Create Project button (under the title) */}
        <div className="mt-4 mb-6">
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-md"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
            </svg>
            Create Project
          </Link>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border bg-white shadow-md animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-md">
            <p>No projects yet.</p>
            <div className="mt-3">
              <Link
                href="/admin/projects/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-md"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                </svg>
                Create your first project
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`}
                className="
                  group block rounded-2xl border border-gray-200 bg-white
                  shadow-md hover:shadow-xl transition-shadow duration-200
                  overflow-hidden
                "
              >
                <div className="p-4">
                  <div className="mb-1 line-clamp-1 text-base font-medium">
                    {p.title || 'Untitled Project'}
                  </div>
                  <div className="text-xs text-gray-600">
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString()
                      : '—'}
                  </div>
                </div>
                <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-700">
                  View details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

