// app/admin/projects/[id]/page.tsx
'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import AssetCard, { type Asset } from '@/app/components/AssetCard';

type Project = { id: string; title: string | null };
type Density = 'comfortable' | 'compact';
type KindFilter =
  | 'all'
  | 'image'
  | 'photo'
  | 'video'
  | 'model'
  | 'pdf'
  | 'orthomosaic'
  | 'other';

export default function ProjectView({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 client components: params is a Promise
  const { id: projectId } = use(params);

  // Data
  const [project, setProject] = useState<Project | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // UI controls
  const [density, setDensity] = useState<Density>('comfortable');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [isAdmin, setIsAdmin] = useState(false);

  // Map of large-preview refs keyed by a stable key (id or index fallback)
  const largeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  // --- helpers ---
  function keyFor(asset: Asset, index: number) {
    // Prefer DB id; fall back to stable index within the *filtered* array
    return String((asset as any).id ?? index);
  }

  function scrollToLarge(k: string) {
    const el = largeRefs.current[k];
    if (el) {
      // account for sticky header using scroll-mt on the target
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setHighlightKey(k);
      // brief highlight to guide the eye
      window.setTimeout(() => setHighlightKey(null), 1400);
      // optional: update hash for sharing
      try {
        history.replaceState(null, '', `#asset-${k}`);
      } catch {}
    }
  }

  // Persist density UI choice
  useEffect(() => {
    try {
      const d = (localStorage.getItem('gridDensity') as Density) || 'comfortable';
      setDensity(d);
    } catch {}
  }, []);
  function toggleDensity() {
    const next = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    try {
      localStorage.setItem('gridDensity', next);
    } catch {}
  }

  // Fetch project + assets
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const [{ data: proj, error: pErr }, { data: rows, error: aErr }] = await Promise.all([
          supabase.from('projects').select('id,title').eq('id', projectId).single(),
          supabase
            .from('assets')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
        ]);
        if (pErr) throw pErr;
        if (aErr) throw aErr;
        if (!cancelled) {
          setProject(proj as Project);
          setAssets((rows || []) as Asset[]);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load project.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Best-effort admin check (adjust to your schema if needed)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data } = await supabase.from('profiles').select('role').eq('id', uid).single();
        if (!cancelled) setIsAdmin((data as any)?.role === 'admin');
      } catch {
        // ignore if your schema differs
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered list used by both sections
  const filtered = useMemo(() => {
    if (kindFilter === 'all') return assets;
    return assets.filter((a) => (a.kind ?? 'other') === kindFilter);
  }, [assets, kindFilter]);

  // Small grid classes (thumbnails)
  const thumbGridClass =
    density === 'compact'
      ? 'grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  const projectTitle = project?.title || 'Project';

  async function shareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard.');
    } catch {
      alert('Could not copy link.');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-xl sm:text-2xl font-semibold">{projectTitle}</h1>
            <p className="text-xs sm:text-sm text-gray-500">Deliverables</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Density */}
            <button
              onClick={toggleDensity}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              title="Toggle grid density"
            >
              {density === 'comfortable' ? 'Compact' : 'Comfortable'}
            </button>

            {/* Filter */}
            <select
              className="rounded-lg border px-3 py-2 text-sm bg-white"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              title="Filter by type"
            >
              <option value="all">All</option>
              <option value="image">Images</option>
              <option value="photo">Photos</option>
              <option value="video">Videos</option>
              <option value="model">Models</option>
              <option value="pdf">PDFs</option>
              <option value="orthomosaic">Orthomosaics</option>
              <option value="other">Other</option>
            </select>

            {/* Share */}
            <button
              onClick={shareLink}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              title="Copy link"
            >
              Share
            </button>

            {/* Upload */}
            <Link
              href={`/admin/projects/${projectId}/upload`}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm"
            >
              Upload
            </Link>
		<Link
  href={`/admin/projects/${projectId}/progress`}
  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
>
  Progress
</Link>
         
 </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {err && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className={`${thumbGridClass}`}>
            {Array.from({ length: density === 'compact' ? 8 : 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white shadow animate-pulse h-56" />
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <p className="text-sm text-gray-600">No deliverables found.</p>
            <div className="mt-4">
              <Link
                href={`/admin/projects/${projectId}/upload`}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
              >
                Upload a file
              </Link>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {!loading && filtered.length > 0 && (
          <>
            {/* 1) THUMBNAIL GRID (click to jump) */}
            <section aria-labelledby="thumbs" className="mb-8">
              <h2 id="thumbs" className="sr-only">
                Thumbnails
              </h2>
              <div className={thumbGridClass}>
                {filtered.map((a, i) => {
                  const k = keyFor(a, i);
                  return (
                    <div
                      key={`thumb-${k}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => scrollToLarge(k)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && scrollToLarge(k)}
                      className="cursor-pointer"
                      title="View larger"
                    >
                      <AssetCard asset={a} canEdit={isAdmin} />
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2) LARGE PREVIEWS (same assets, stacked) */}
            <section aria-labelledby="large-previews" className="space-y-6">
              <h2 id="large-previews" className="text-lg font-semibold text-gray-800 mb-2">
                Full-size previews
              </h2>

              {filtered.map((a, i) => {
                const k = keyFor(a, i);
                const isHighlighted = highlightKey === k;
                return (
                  <div
                    key={`large-${k}`}
                    id={`asset-${k}`}
                    ref={(el) => (largeRefs.current[k] = el)}
                    className={`max-w-5xl mx-auto scroll-mt-24 transition-shadow ${
                      isHighlighted ? 'ring-2 ring-blue-500 rounded-2xl shadow-md' : ''
                    }`}
                  >
                    <AssetCard asset={a} canEdit={isAdmin} />
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

