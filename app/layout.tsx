// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import UserBarServer from '@/components/UserBarServer';

export const metadata: Metadata = {
  title: 'StrandAerial Client Portal',
  description: 'Secure access to projects, invoices, and updates.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
            {/* ...logo / nav... */}
            <Link href="/" className="text-sm font-semibold">
              <span className="text-gray-900">Client Portal • </span>
              <span className="text-brand-teal">StrandAerial</span>
            </Link>

            <nav className="ml-6 hidden items-center gap-4 text-sm sm:flex">
              {/* Add any public nav links here if needed */}
            </nav>

            <div className="ml-auto">
              {/* Server wrapper ensures correct auth state on first paint */}
              <UserBarServer />
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </body>
    </html>
  );
}

