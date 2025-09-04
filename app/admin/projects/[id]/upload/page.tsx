// app/admin/projects/[id]/upload/page.tsx
import AssetCard, { type Asset } from '@/components/AssetCard';
import type { Metadata } from 'next';

type RouteParams = { id: string };

// ✅ In Next 15, the inferred page prop type uses a Promise for `params`.
// Making the component `async` and awaiting `params` satisfies the constraint.
export default async function UploadPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;

  // Demo asset so the page renders; replace with your real data/uploader
  const demoAsset: Asset = {
    id: `demo-${id}`,
    title: 'Upload Preview',
    kind: 'image',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
  };

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6">
        <span className="inline-block rounded-full bg-brand-teal/10 px-3 py-1 text-brand-teal">
          Project #{id}
        </span>
        <h1 className="mt-3 font-display text-3xl leading-tight">
          Upload files for <span className="text-brand-teal">StrandAerial</span>
        </h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/70">
          Page exports a valid component and awaits Next 15’s async params.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AssetCard asset={demoAsset} canEdit />
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Upload | Project ${id} • StrandAerial` };
}

