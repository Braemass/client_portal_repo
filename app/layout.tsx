// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Deliverables & progress viewer',
};

const supabaseOrigin =
  (() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    try { return url ? new URL(url).origin : undefined; }
    catch { return url || undefined; }
  })() || 'https://YOUR_PROJECT_REF.supabase.co'; // fallback if env missing

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Speed up first connection to Supabase (images, API, storage) */}
        <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />
        <link rel="dns-prefetch" href={supabaseOrigin} />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}

