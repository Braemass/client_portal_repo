// app/components/AssetCard.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Asset = {
  id: string;
  title?: string | null;
  kind?: 'image' | 'video' | 'model' | 'file' | string | null;
  /**
   * Public, fully-qualified URL (if already known)
   */
  public_url?: string | null;
  /**
   * Raw storage path inside the originals bucket, e.g. "projects/123/IMG_001.jpg"
   */
  storage_path?: string | null;
  /**
   * Legacy/alternate path field (kept for compatibility)
   */
  path?: string | null;
  /**
   * Optional fallback direct URL
   */
  url?: string | null;
  created_at?: string | null;
  is_progress?: boolean | null;
};

type Props = {
  asset: Asset;
  canEdit?: boolean;
  className?: string;
  onChanged?: () => void;
};

/** Buckets (adjust if your project uses different names) */
const BUCKET_ORIGINALS = 'deliverables';
// const BUCKET_PREVIEWS  = 'previews';

function extFromUrl(url?: string | null): string {
  if (!url) return '';
  const clean = url.split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

const AssetCard: FC<Props> = ({ asset, canEdit, className, onChanged }) => {
  const [src, setSrc] = useState<string | null>(asset.public_url ?? asset.url ?? null);
  const [signing, setSigning] = useState(false);

  const title = asset.title ?? 'Untitled Asset';

  const resolvedKind = useMemo<'image' | 'video' | 'model' | 'file'>(() => {
    if (asset.kind && ['image', 'video', 'model', 'file'].includes(asset.kind)) {
      return asset.kind as 'image' | 'video' | 'model' | 'file';
    }
    const ext = extFromUrl(asset.public_url ?? asset.url ?? asset.storage_path ?? asset.path ?? '');
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'tiff', 'tif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
    if (['glb', 'gltf', 'obj', 'fbx'].includes(ext)) return 'model';
    return 'file';
  }, [asset.kind, asset.public_url, asset.url, asset.storage_path, asset.path]);

  // Create a signed URL for images when we only have a storage path
  useEffect(() => {
    let cancelled = false;

    async function signIfNeeded() {
      // If we already have a URL, no need to sign again.
      if (src) return;

      const originalPath =
        asset.storage_path ?? asset.path ?? undefined;

      // Only sign for images with a storage path
      if (!originalPath || resolvedKind !== 'image') return;

      setSigning(true);

      // Supabase JS v2: transform supports width/height/quality/resize, and `format: 'origin'`.
      // We intentionally omit `format` here to keep the original format and satisfy TS.
      const { data, error } = await supabase.storage
        .from(BUCKET_ORIGINALS)
        .createSignedUrl(originalPath, 60 * 60 * 24 * 7, {
	transform: { width: 1600, quality: 75, resize: 'contain', format: 'origin' },
        });

      if (!cancelled) {
        setSigning(false);
        if (!error && data?.signedUrl) {
          setSrc(data.signedUrl);
        } else if (asset.public_url || asset.url) {
          // Fallback to any provided URL if signing failed
          setSrc((asset.public_url ?? asset.url) as string);
        }
      }
    }

    signIfNeeded();

    return () => {
      cancelled = true;
    };
    // Only re-run when these change
  }, [asset.storage_path, asset.path, asset.public_url, asset.url, resolvedKind, src]);

  return (
    <div
      className={
        'rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-[#0E1B2B] ' +
        (className ?? '')
      }
    >
      {/* Preview */}
      <div className="relative overflow-hidden rounded-t-2xl">
        {resolvedKind === 'image' && (src || signing) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src ?? ''}
            alt={title}
            className="h-56 w-full object-cover"
          />
        ) : resolvedKind === 'video' && src ? (
          <video src={src} controls className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-black/5 dark:bg-white/5">
            <span className="rounded-lg bg-brand-teal/10 px-3 py-1 text-sm text-brand-teal">
              {resolvedKind === 'model' ? '3D Model' : 'File'}
            </span>
          </div>
        )}

        {signing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white">
            Generating preview…
          </div>
        )}
      </div>

      {/* Meta / Actions */}
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg leading-tight">{title}</h3>
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
                  // TODO: wire replace flow (file input/uploader)
                  onChanged?.();
                }}
              >
                Replace
              </button>
              <button
                type="button"
                className="rounded-md bg-brand-teal px-3 py-1 text-sm text-white hover:opacity-90"
                onClick={() => {
                  // TODO: wire remove flow
                  onChanged?.();
                }}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>

        {src ? (
          <a
            href={src}
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
};

export default AssetCard;

