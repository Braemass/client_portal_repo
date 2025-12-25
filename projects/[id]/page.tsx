'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Asset = {
  id: string;
  title: string;
  kind: string;
  url: string | null;
  sketchfab_url: string | null;
};

export default function ProjectPublicPage() {
  const params = useParams();
  const id = (params as Record<string, string>).id;

  const [email, setEmail] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  // Current user (no auth-helpers-react)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    })();
  }, []);

  // Fetch assets for this project
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setErr('');
      const { data, error } = await supabase
        .from('assets')
        .select('id,title,kind,url,sketchfab_url')
        .eq('project_id', id)
        .order('title', { ascending: true });

      if (error) setErr(error.message);
      setAssets((data ?? []) as Asset[]);
      setLoading(false);
    })();
  }, [id]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <span className="inline-block rounded-full bg-brand-teal/10 px-3 py-1 text-brand-teal">
          Project #{id}
        </span>
        <h1 className="mt-3 font-display text-3xl leading-tight">Project Assets</h1>
        <p className="text-sm text-black/60 dark:text-white/70">
          {email ? <>Signed in as <strong>{email}</strong></> : 'Not signed in'}
        </p>
      </header>

      {err && <div className="mb-4 rounded-xl border bg-red-50 p-3 text-red-700">{err}</div>}

      {loading ? (
        <div className="rounded-xl border bg-white p-4">Loading…</div>
      ) : assets.length === 0 ? (
        <p className="text-black/70 dark:text-white/70">No assets found.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <li
              key={a.id}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-[#0E1B2B]"
            >
              <div className="p-4">
                <h3 className="font-display text-lg leading-tight">{a.title}</h3>
                <p className="text-xs text-black/60 dark:text-white/60">{a.kind}</p>
              </div>

              {a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="flex h-48 items-center justify-center bg-black/5 dark:bg-white/10">
                  <span className="rounded-lg bg-brand-teal/10 px-3 py-1 text-sm text-brand-teal">
                    No preview
                  </span>
                </div>
              )}

              <div className="p-4">
                {a.sketchfab_url && (
                  <a
                    href={a.sketchfab_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    View on Sketchfab
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

