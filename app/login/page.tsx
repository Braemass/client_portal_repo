// app/login/page.tsx
import LoginClient from './LoginClient';

export const metadata = {
  title: 'Client Portal • StrandAerial — Login',
};

export default async function Page() {
  return (
    <main className="min-h-[75vh] grid place-items-center bg-slate-950">
      <div className="w-full max-w-[440px] rounded-2xl bg-white/5 border border-white/10 p-6 shadow-2xl">
        <h1 className="text-xl font-bold text-sky-400">Client Portal with StrandAerial</h1>
        <p className="mt-1 text-sm text-slate-300">
          Sign in to view your profile and projects. Admins can use the Admin Login.
        </p>
        <div className="mt-6">
          <LoginClient />
        </div>
      </div>
    </main>
  );
}

