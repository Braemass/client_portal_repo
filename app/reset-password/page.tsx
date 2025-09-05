// app/reset-password/page.tsx
import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export const dynamic = 'force-dynamic'; // don't prerender; depends on query params
export const revalidate = 0;

export const metadata = {
  title: 'Reset password • StrandAerial Client Portal',
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_0%,rgba(15,23,42,.5),rgba(2,6,23,1))] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-semibold">Create a new password</h1>
            <p className="mt-2 text-sm text-slate-400">
              Enter a new password for your account.
            </p>

            {/* useSearchParams() lives inside this Suspense boundary */}
            <Suspense fallback={<div className="mt-6 text-slate-400">Loading…</div>}>
              <ResetPasswordClient />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

