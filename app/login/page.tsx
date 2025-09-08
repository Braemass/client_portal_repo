// app/login/page.tsx
import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0b2239] text-white">
      {/* Center the card / content */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="opacity-80">Client Portal</span>{' '}
            <span className="opacity-60">• StrandAerial</span>
          </h1>
        </header>

        <div className="flex min-h-[70vh] items-center justify-center">
          <Suspense
            fallback={
              <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/80">
                Loading…
              </div>
            }
          >
            <LoginClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

