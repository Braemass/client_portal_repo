'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Asset = {
  id?: string;
  title?: string | null;
  url?: string | null;
  path?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
};

const BUCKET = 'deliverables';

function getStoragePath(a?: Asset | null): string | null {
  if (!a) return null;
  return a.url || a.path || a.storage_path || null;
}

async function getImageUrl(asset?: Asset | null): Promise<string | null> {
  if (!asset) return null;
  const sp = getStoragePath(asset);
  if (sp) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(sp, 300);
    if (!error && data?.signedUrl) return data.signedUrl;
  }
  if ((asset as any)?.public_url) return (asset as any).public_url;
  return null;
}

export default function CompareSlider({
  left,
  right,
  height = 520,
}: {
  left: Asset;
  right: Asset;
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [pos, setPos] = useState(50);

  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [l, r] = await Promise.all([getImageUrl(left), getImageUrl(right)]);
      if (!cancelled) { setLeftUrl(l); setRightUrl(r); }
    })();
    return () => { cancelled = true; };
  }, [left?.id, right?.id, left?.url, right?.url]);

  useEffect(() => {
    wrapRef.current?.style.setProperty('--pos', `${pos}%`);
  }, [pos]);

  function pctFromClientX(clientX: number) {
    const el = wrapRef.current;
    if (!el) return pos;
    const rect = el.getBoundingClientRect();
    const p = Math.round(((clientX - rect.left) / rect.width) * 100);
    return Math.max(0, Math.min(100, p));
  }

  function onPointerDown(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const p = pctFromClientX(e.clientX);
    el.style.setProperty('--pos', `${p}%`);
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => { setPos(p); rafRef.current = null; });
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    if (!(el as any).hasPointerCapture?.(e.pointerId)) return;
    const p = pctFromClientX(e.clientX);
    el.style.setProperty('--pos', `${p}%`);
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => { setPos(p); rafRef.current = null; });
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    setPos(pctFromClientX(e.clientX));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      const p = Math.max(0, pos - 2);
      setPos(p); wrapRef.current?.style.setProperty('--pos', `${p}%`);
    }
    if (e.key === 'ArrowRight') {
      const p = Math.min(100, pos + 2);
      setPos(p); wrapRef.current?.style.setProperty('--pos', `${p}%`);
    }
  }

  const leftClip = 'inset(0 calc(100% - var(--pos)) 0 0)';

  return (
    <div
      ref={wrapRef}
      role="slider"
      aria-label="Before/After comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pos}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="
        relative w-full select-none rounded-2xl border border-gray-200 bg-white
        shadow-2xl ring-1 ring-black/5 overflow-hidden
        outline-none focus:ring-2 focus:ring-blue-500/30
      "
      style={{ height, ['--pos' as any]: `${pos}%` } as React.CSSProperties}
    >
      {/* After */}
      {rightUrl ? (
        <img
          src={rightUrl}
          alt="After"
          className="absolute inset-0 h-full w-full object-contain bg-white"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-white" />
      )}

      {/* Before (clipped) */}
      <div className="absolute inset-0" style={{ clipPath: leftClip }} aria-hidden>
        {leftUrl ? (
          <img
            src={leftUrl}
            alt="Before"
            className="absolute inset-0 h-full w-full object-contain bg-white"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 bg-white" />
        )}
      </div>

      {/* Solid black split line */}
      <div
        className="pointer-events-none absolute top-0 bottom-0"
        style={{ left: 'calc(var(--pos) - 2px)', width: '4px', backgroundColor: '#000' }}
        aria-hidden
      />

      {/* Handle */}
      <button
        type="button"
        aria-label="Drag to compare"
        title="Drag to compare"
        className="
          absolute top-1/2 -translate-y-1/2 -translate-x-1/2
          h-12 w-12 rounded-full bg-white shadow-md ring-1 ring-black/10
          flex items-center justify-center cursor-ew-resize
        "
        style={{ left: 'var(--pos)' }}
      >
        <div className="grid grid-cols-2 gap-1">
          <span className="h-1 w-1 rounded-full bg-gray-600" />
          <span className="h-1 w-1 rounded-full bg-gray-600" />
          <span className="h-1 w-1 rounded-full bg-gray-600" />
          <span className="h-1 w-1 rounded-full bg-gray-600" />
        </div>
      </button>

      {/* Badges */}
      <div className="absolute left-3 top-3 rounded-md bg-white px-2 py-0.5 text-[12px] font-medium shadow">
        Before
      </div>
      <div className="absolute right-3 top-3 rounded-md bg-white px-2 py-0.5 text-[12px] font-medium shadow">
        After
      </div>
    </div>
  );
}

