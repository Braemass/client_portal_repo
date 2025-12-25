'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

export default function ProjectPageClient({ id }: { id: string }) {
  type Asset = {
    key: string;
    title: string;
    kind?: 'image' | 'video' | 'file';
    url?: string;
  };

  // Demo data — replace with real project assets
  const [assets] = useState<Asset[]>([
    {
      key: 'a',
      title: 'Site Overview',
      kind: 'image',
      url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    },
    {
      key: 'b',
      title: 'Closeup',
      kind: 'image',
      url: 'https://images.unsplash.com/photo-1529078155058-5d716f45d604?w=1200&q=80',
    },
    {
      key: 'c',
      title: 'Progress Frame',
      kind: 'image',
      url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80',
    },
  ]);

  // Typed map of refs (TS-safe)
  const largeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Stable setter that returns void (required for React ref callbacks)
  const setLargeRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      largeRefs.current[key] = el;
    },
    []
  );

  // Example highlight logic; swap with your own if needed
  const highlightedKey = useMemo<string | null>(() => null, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <span className="inline-block rounded-full bg-brand-teal/10 px-3 py-1 text-brand-teal">
          Project #{id}
        </span>
        <h1 className="mt-3 font-display text-3xl leading-tight">
          Strand<span className="text-brand-teal">Aerial</span> — Project Details
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/70">
          Ref callbacks are fixed (return void) and ref maps are typed. Replace the demo assets with your real data.
        </p>
      </header>

      <section className="space-y-10">
        {assets.map((asset) => {
          const isHighlighted = highlightedKey === asset.key;
          return (
            <div
              key={`large-${asset.key}`}
              id={`asset-${asset.key}`}
              ref={setLargeRef(asset.key)}
              className={`mx-auto max-w-5xl scroll-mt-24 transition-shadow ${
                isHighlighted ? 'rounded-2xl ring-2 ring-blue-500 shadow-md' : ''
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm dark:border-white/15 dark:bg-[#0E1B2B]">
                <div className="p-4">
                  <h2 className="font-display text-xl">{asset.title}</h2>
                </div>

                {asset.kind === 'image' && asset.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.title}
                    className="h-80 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-80 w-full items-center justify-center bg-black/5 dark:bg-white/10">
                    <span className="rounded-lg bg-brand-teal/10 px-3 py-1 text-sm text-brand-teal">
                      {asset.kind?.toUpperCase() ?? 'FILE'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}

