// app/login/page.tsx
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Client Portal • StrandAerial — Login',
};

// prevent static prerender so search params are resolved at runtime
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[75vh] grid place-items-center bg-slate-950">
      <div className="w-full max-w-[440px] rounded-2xl bg-white/5 border border-white/10 p-6 shadow-2xl">
        <h1 className="text-xl font-bold text-sky-400">Client Portal with StrandAerial</h1>
        <p className="mt-1 text-sm text-slate-300">
          Sign in to view your profile and projects. Admins can use the Admin Login.
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <LoginShell>
      {/* This boundary satisfies Next.js when a child uses useSearchParams */}
      <Suspense
        fallback={
          <div className="text-slate-400 text-sm">Loading login…</div>
        }
      >
        <LoginClient />
      </Suspense>
    </LoginShell>
  );
}

