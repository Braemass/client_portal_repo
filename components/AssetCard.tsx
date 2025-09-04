'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type Asset = {
  id: string;
  kind: 'image' | 'photo' | 'video' | 'pdf' | 'orthomosaic' | 'model' | 'other' | string;
  title: string | null;
  // different projects sometimes name the storage key differently:
  url?: string | null;           // e.g. "projectId/filename.ext"
  path?: string | null;          // alternative name
  storage_path?: string | null;  // alternative name
  public_url?: string | null;    // if you ever store a public link
  sketchfab_url?: string | null; // for 3D models
};

type Props = { asset: Asset };

const BUCKET = 'deliverables';

// Normalize title (hide legacy "div>")
function cleanTitle(a: Asset) {
  const t = (a.title ?? '').trim();
  if (!t || /^div>?$/i.test(t)) return a.kind === 'model' ? '3D Model' : 'Asset';
  return t;
}

// Best-effort storage path from the asset
function getStoragePath(a: Asset): string | null {
  return (a.url ?? a.path ?? a.storage_path ?? null) || null;
}

export default function AssetCard({ asset }: Props) {
  const [downloading, setDownloading] = useState(false);
  const niceTitle = cleanTitle(asset);

  const storagePath = getStoragePath(asset);
  const canDownload = asset.kind !== 'model' && !!storagePath;

  async function handleDownload() {
    setDownloading(true);
    try {
      // If we have a storage object path → generate a signed URL that forces download
      if (storagePath) {
        const filename =
          niceTitle && niceTitle !== 'Asset'
            ? `${niceTitle}`.replace(/[^\w.\- ]+/g, '_')
            : storagePath.split('/').pop() || 'download';

        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, 60, { download: filename });

        if (error) throw error;

        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // Fallback: if only a public_url exists, just open it
      if (asset.public_url) {
        const a = document.createElement('a');
        a.href = asset.public_url;
        a.rel = 'noopener';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      alert('No downloadable path found for this asset.');
    } catch (err) {
      console.error(err);
      alert('Could not generate download link.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white shadow overflow-hidden">

