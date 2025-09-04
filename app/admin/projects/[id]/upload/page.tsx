'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Asset = {
  id: string;
  title?: string | null;
  kind?: string | null;      // 'image' | 'model' | 'video' | 'other' | legacy 'photo'
  url?: string | null;
  path?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  created_at?: string | null;
  progress_group?: string | null;
  is_progress?: boolean | null;
};

type Props = {
  asset: Asset;
  canEdit?: boolean;
  className?: string;
  onChanged?: () => void;
};

const BUCKET_ORIGINALS = 'deliverables';
const BUCKET_PREVIEWS  = 'previews';

function cleanTitle(a: Asset) {
  const t = (a.title ?? '').trim();
  if (!t || /^div>?$/i.test(t)) return a.kind === 'model' ? '3D Model' : 'Asset';
  return t;
}
function storagePathOf(a: Asset): string | null {
  return a.url || a.path || a.storage_path || null;
}
function derivePreviewPaths(original: string) {
  return {
    p480:  original.replace(/(\.[^/.]+)?$/, '-thumb-480.webp'),
    p1920: original.replace(/(\.[^/.]+)?$/, '-preview-1920.webp'),
  };
}
function getSketchfabEmbed(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (url.hostname.includes('sketchfab.com') && url.pathname.includes('/embed')) return url.toString();
    const m = url.pathname.match(/\/models\/([a-z0-9]+)(?:[/?]|$)/i) || url.pathname.match(/([a-z0-9]{10,})/i);
    const id = m?.[1];
    if (id) return `https://sketchfab.com/models/${id}/embed`;
  } catch {}
  return null;
}

export default function AssetCard({ asset, canEdit, className, onChanged }: Props) {
  const [title, setTitle] = useState<string>(cleanTitle(asset));
  const [editing, setEditing] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const triedRef = useRef<{ public480?: boolean; public1920?: boolean; transform?: boolean; raw?: boolean }>({});

  const originalPath = useMemo(() => storagePathOf(asset), [asset]);
  const previews = useMemo(
    () => (originalPath ? derivePreviewPaths(originalPath) : null),
    [originalPath]
  );

  const isModel = asset.kind === 'model';
  const sketchEmbed = useMemo(
    () => getSketchfabEmbed(asset.public_url || asset.url || undefined),
    [asset.public_url, asset.url]
  );

  // Load in order: public 480 → public 1920 → transformed signed → raw signed
  useEffect(() => {
    let cancelled = false;
    triedRef.current = {};
    (async () => {
      if (!originalPath || isModel) { setSrc(null); return; }

      // (1) PUBLIC 480 (instant CDN)
      if (previews && !triedRef.current.public480) {
        triedRef.current.public480 = true;
        const pub = supabase.storage.from(BUCKET_PREVIEWS).getPublicUrl(previews.p480).data.publicUrl;
        if (pub && !cancelled) { setSrc(pub); return; }
      }

      // (2) PUBLIC 1920
      if (previews && !triedRef.current.public1920) {
        triedRef.current.public1920 = true;
        const pub = supabase.storage.from(BUCKET_PREVIEWS).getPublicUrl(previews.p1920).data.publicUrl;
        if (pub && !cancelled) { setSrc(pub); return; }
      }

      // (3) Signed transform (fast-ish)
      if (!triedRef.current.transform) {
        triedRef.current.transform = true;
        const { data } = await supabase.storage
          .from(BUCKET_ORIGINALS)
          .createSignedUrl(originalPath, 60 * 60 * 24 * 7, {
            transform: { width: 1600, quality: 75, format: 'webp', resize: 'contain' },
          });
        if (!cancelled && data?.signedUrl) { setSrc(data.signedUrl); return; }
      }

      // (4) Raw signed
      if (!triedRef.current.raw) {
        triedRef.current.raw = true;
        const { data } = await supabase.storage
          .from(BUCKET_ORIGINALS)
          .createSignedUrl(originalPath, 60 * 60 * 24 * 7);
        if (!cancelled && data?.signedUrl) { setSrc(data.signedUrl); return; }
      }

      if (!cancelled) setSrc(null);
    })();
    return () => { cancelled = true; };
  }, [originalPath, previews, isModel]);

  function handleImgError() {
    // If 480 failed, try 1920; else try transform; else raw; else give up.
    (async () => {
      if (!originalPath) return;

      if (src && previews && src.includes('-thumb-480.webp') && !triedRef.current.public1920) {
        triedRef.current.public1920 = true;
        const pub = supabase.storage.from(BUCKET_PREVIEWS).getPublicUrl(previews.p1920).data.publicUrl;
        if (pub) { setSrc(pub); return; }
      }
      if (!triedRef.current.transform) {
        triedRef.current.transform = true;
        const { data } = await supabase.storage
          .from(BUCKET_ORIGINALS)
          .createSignedUrl(originalPath, 60 * 60 * 24 * 7, {
            transform: { width: 1600, quality: 75, format: 'webp', resize: 'contain' },
          });
        if (data?.signedUrl) { setSrc(data.signedUrl); return; }
      }
      if (!triedRef.current.raw) {
        triedRef.current.raw = true;
        const { data } = await supabase.storage
          .from(BUCKET_ORIGINALS)
          .createSignedUrl(originalPath, 60 * 60 * 24 * 7);
        if (data?.signedUrl) { setSrc(data.signedUrl); return; }
      }
      setSrc(null);
    })();
  }

  async function saveTitle() {
    const t = title.trim();
    setEditing(false);
    if (!t || t === (asset.title ?? '')) return;
    const { error } = await supabase.from('assets').update({ title: t }).eq('id', asset.id);
    if (error) { setTitle(cleanTitle(asset)); console.error('Rename failed:', error); }
    else onChanged?.();
  }

  async function onDownload() {
    const path = originalPath;
    if (!path) return;
    const fileName = (asset.title && asset.title.trim()) || path.split('/').pop() || 'download';
    const { data } = await supabase.storage.from(BUCKET_ORIGINALS).createSignedUrl(path, 60, { download: fileName });
    if (!data?.signedUrl) return;
    const a = document.createElement('a');
    a.href = data.signedUrl; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className={['group relative rounded-2xl border border-gray-200 bg-white','shadow-md hover:shadow-xl transition-shadow duration-200','overflow-hidden',className||''].join(' ')}>
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        {editing ? (
          <input
            className="min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            autoFocus
          />
        ) : (
          <div className="min-w-0 flex-1 truncate font-medium">{title}</div>
        )}
        <span className="rounded-full border px-2 py-0.5 text-[11px] text-gray-600 bg-gray-50">
          {asset.kind ?? 'asset'}
        </span>
        {canEdit && !editing && (
          <button aria-label="Rename" title="Rename" className="rounded p-1 hover:bg-gray-100" onClick={() => setEditing(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-gray-600">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2-2a1.25 1.25 0 0 0-1.77 0l-1.83 1.83 3.75 3.75 1.85-1.81z"/>
            </svg>
          </button>
        )}
      </div>

      {/* Media */}
      <div className="relative">
        {isModel && sketchEmbed ? (
          <div className="aspect-[16/9] w-full bg-gray-100">
            <iframe className="h-full w-full" src={sketchEmbed} title={title} frameBorder={0} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen />
          </div>
        ) : (
          <div className="bg-gray-100">
            <div className="aspect-[16/9] w-full">
              {src ? (
                <img
                  src={src}
                  alt={title}
                  className="h-full w-full object-contain bg-white"
                  loading="lazy"
                  decoding="async"
                  onError={handleImgError}
                />
              ) : (
                <div className="h-full w-full animate-pulse bg-gray-100" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 p-3">
        {originalPath && (
          <button onClick={onDownload} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
            Download
          </button>
        )}
        {!!asset.progress_group && (
          <span className="ml-auto rounded-md border px-2 py-0.5 text-[11px] text-gray-600 bg-gray-50">
            {asset.progress_group}
          </span>
        )}
      </div>
    </div>
  );
}

