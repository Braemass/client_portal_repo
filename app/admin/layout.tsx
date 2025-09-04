import type { ReactNode } from 'react';
import Link from 'next/link';
import UserBar from '@/components/UserBar';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Top admin nav */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl h-12 sm:h-14 px-4 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-semibold hover:opacity-80">Admin</Link>
            <Link href="/admin/projects" className="hover:opacity-80">Projects</Link>
            <Link href="/admin/clients" className="hover:opacity-80">Clients</Link>
            <Link href="/admin/upload" className="hover:opacity-80">Upload</Link>
            <Link href="/admin/invoices" className="hover:opacity-80">Invoices</Link>
          </nav>
          <UserBar />
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

