// components/AssetCard.tsx
'use client';

import { useMemo } from 'react';

export type Asset = {
  id: string;
  title?: string | null;
  kind?: 'image' | 'video' | 'model' | 'file' | string | null;
  url?: string | null;          // public URL to preview
  created_at?: string | null;
  is_progress?: boolean | null; // optional flag you mentioned earlier
};

type Props = {
  asset: Asset;
  canEdit?: boolean;
  className?: string;
  onChanged?: () => void; // call after replace/remove, if you wire those up later
};

function extFromUrl(url?: string | null): string {
  if (!url) return '';
  const q = url.split('?')[0];
  const parts = q.split('.');
  return parts[parts.length - 1]?.toLowerCase() ?? '';
}

export default function AssetCard({ asset, canEdit, className, onChanged }: Props) {
  const { title, url, kind } = asset;

  const resolvedKind = useMemo(() => {
    if (kind) return kind;
    const ext = extFromUrl(url);
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'tif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
    if (['glb', 'gltf', 'obj', 'fbx'].includes(ext)) return 'model';
    return 'file';
  }, [kind, url]);

  return (
    <div
      className={
        'rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-[#0E1B2B] ' +
        (className ?? '')
      }
    >
      {/* Preview */}
      <div className="relative overflow-hidden rounded-t-2xl">
        {resolvedKind === 'image' && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title ?? 'Asset'} className="h-56 w-full object-cover" />
        ) : resolvedKind === 'video' && url ? (
          // Keep controls for quick sanity checks
          <video src={url} controls className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-black/5 dark:bg-white/5">
            <span className="rounded-lg bg-brand-teal/10 px-3 py-1 text-sm text-brand-teal">
              {resolvedKind === 'model' ? '3D Model' : 'File'}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg leading-tight">
              {title ?? 'Untitled Asset'}
            </h3>
            {asset.is_progress ? (
              <span className="mt-1 inline-block rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs text-brand-teal">
                Progress
              </span>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-black/10 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                onClick={() => {
                  // Wire your replace logic here (file input / uploader)
                  onChanged?.();
                }}
              >
                Replace
              </button>
              <button
                type="button"
                className="rounded-md bg-brand-teal px-3 py-1 text-sm text-white hover:opacity-90"
                onClick={() => {
                  // Wire your remove logic here
                  onChanged?.();
                }}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>

        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-sm text-black/70 underline hover:text-black dark:text-white/70 dark:hover:text-white"
          >
            Open original
          </a>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">No URL available</p>
        )}
      </div>
    </div>
  );
}

