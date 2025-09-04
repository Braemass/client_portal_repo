'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import CompareSlider from '@/app/components/CompareSlider';

type Asset = {
  id: string;
  title?: string | null;
  kind?: string | null;
  url?: string | null;
  path?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  is_progress?: boolean | null;
  progress_group?: string | null;
  created_at?: string | null;
};

type Project = { id: string; title: string | null };

const BUCKET = 'deliverables';

function Thumb({
  asset,
  onClick,
  onShiftClick,
}: {
  asset: Asset;
  onClick: () => void;
  onShiftClick: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const path = asset.url || asset.path || asset.storage_path || null;
      if (path) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 120);
        if (!cancelled) setSrc(data?.signedUrl ?? null);
      } else if (asset.public_url) {
        setSrc(asset.public_url);
      }
    })();
    return () => { cancelled = true; };
  }, [asset.id, asset.url, asset.path, asset.storage_path, asset.public_url]);

  return (
    <button
      onClick={(e) => (e.shiftKey ? onShiftClick() : onClick())}
      className="group relative rounded-xl border bg-white overflow-hidden hover:shadow"
      title="Click = Before, Shift+Click = After"
    >
      <div className="aspect-[4/3] bg-gray-100">
        {src ? (
          <img src={src} alt={asset.title ?? 'Photo'} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gray-100" />
        )}
      </div>
      <div className="absolute left-2 top-2 rounded bg-white/90 px-1.5 py-0.5 text-[11px] shadow">
        {asset.progress_group || '—'}
      </div>
      <div className="absolute right-2 bottom-2 hidden group-hover:block">
        <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] border">Set</span>
      </div>
    </button>
  );
}

export default function ProjectProgress({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [group, setGroup] = useState<string | 'all'>('all');
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

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
            .eq('is_progress', true)
            .eq('kind', 'image') // only image progress photos
            .order('progress_group', { ascending: false })
            .order('created_at', { ascending: false }),
        ]);
        if (pErr) throw pErr;
        if (aErr) throw aErr;
        if (!cancelled) {
          setProject(proj as Project);
          setPhotos((rows || []) as Asset[]);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Failed to load progress photos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const groups = useMemo(() => {
    const s = new Set<string>();
    photos.forEach((p) => p.progress_group && s.add(p.progress_group));
    return Array.from(s).sort().reverse();
  }, [photos]);

  const filtered = useMemo(() => {
    if (group === 'all') return photos;
    return photos.filter((p) => p.progress_group === group);
  }, [photos, group]);

  const left = photos.find((p) => p.id === leftId) || null;
  const right = photos.find((p) => p.id === rightId) || null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header with Back button */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/projects/${projectId}`}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Back to Project
          </Link>

          <div className="ml-1">
            <h1 className="text-xl sm:text-2xl font-semibold">
              {project?.title || 'Project'} — Progress Compare
            </h1>
            <p className="text-sm text-gray-600">Select two progress photos to compare.</p>
          </div>
        </div>

        {err && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        {/* Timeline chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-3 py-1 text-sm ${group === 'all' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
            onClick={() => setGroup('all')}
          >
            All
          </button>
          {groups.map((g) => (
            <button
              key={g}
              className={`rounded-full border px-3 py-1 text-sm ${group === g ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Selection bar */}
        <div className="mb-4 rounded-xl border bg-white p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">Before:</div>
            <select
              className="rounded border px-2 py-1 text-sm bg-white"
              value={leftId ?? ''}
              onChange={(e) => setLeftId(e.target.value || null)}
            >
              <option value="">(choose)</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.progress_group ? `${p.progress_group} — ` : ''}{p.title || p.id}
                </option>
              ))}
            </select>

            <div className="text-sm ml-4">After:</div>
            <select
              className="rounded border px-2 py-1 text-sm bg-white"
              value={rightId ?? ''}
              onChange={(e) => setRightId(e.target.value || null)}
            >
              <option value="">(choose)</option>
              {photos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.progress_group ? `${p.progress_group} — ` : ''}{p.title || p.id}
                </option>
              ))}
            </select>

            <button
              className="ml-auto rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => { setLeftId(null); setRightId(null); }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Thumbnails */}
        <div className="mb-6">
          <div className="mb-2 text-sm text-gray-600">
            Click a photo to set <b>Before</b>; Shift-click to set <b>After</b>.
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl border bg-white animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-sm text-gray-600">No progress photos in this group.</div>
            ) : (
              filtered.map((p) => (
                <Thumb
                  key={p.id}
                  asset={p}
                  onClick={() => setLeftId(p.id)}
                  onShiftClick={() => setRightId(p.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Slider */}
        {left && right ? (
          <div className="rounded-2xl border bg-white p-4 shadow-2xl ring-1 ring-black/5">
            <CompareSlider left={left} right={right} />
          </div>
        ) : (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600">
            Choose a Before and After photo to compare.
          </div>
        )}
      </div>
    </main>
  );
}

