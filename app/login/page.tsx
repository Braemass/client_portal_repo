// app/login/page.tsx
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'StrandAerial • Client Portal — Login',
};

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mx-auto w-full max-w-[440px] rounded-2xl bg-white/[0.06] border border-white/10 p-6 shadow-2xl backdrop-blur">
          <h1 className="text-xl font-bold text-sky-400">Client Portal with StrandAerial</h1>
          <p className="mt-1 text-sm text-slate-300">
            Sign in to view your profile and projects. Admins can use the Admin Login.
          </p>

          <div className="mt-6">
            <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}>
              <LoginClient />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

