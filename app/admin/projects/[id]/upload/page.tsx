// app/admin/projects/[id]/upload/page.tsx
import AssetCard, { type Asset } from '@/components/AssetCard';

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

// ✅ App Router requires a default export that is a React component (can be async).
export default async function UploadPage({ params }: PageProps) {
  const { id } = params;

  // TODO: replace this with real data fetch for project assets.
  // Keeping a safe demo asset so the page compiles & renders on Vercel.
  const demoAsset: Asset = {
    id: 'demo-' + id,
    title: 'Upload Preview',
    kind: 'image',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80',
    is_progress: false,
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
          This page now exports a valid component. Replace the demo below with your real uploader and list.
        </p>
      </header>

      {/* Replace with your uploader UI */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AssetCard asset={demoAsset} canEdit />
      </section>
    </main>
  );
}

// (Optional) Nice page title for the tab
export async function generateMetadata({ params }: PageProps) {
  return { title: `Upload | Project ${params.id} • StrandAerial` };
}

