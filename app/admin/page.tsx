// app/admin/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import CreateClientForm from '@/components/admin/CreateClientForm';

export const dynamic = 'force-dynamic'; // always read live auth + data

// Fallback to your email if NEXT_PUBLIC_ADMIN_EMAILS isn't set
const ADMIN_EMAILS =
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'braemass22@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

function isAdminEmail(email?: string | null) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export default async function AdminHome() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // NOTE: In your setup cookies() is async, so await it here.
  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // We only need read access on this page
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });

  // 1) Ensure signed-in and admin
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    // go sign in and bounce back here after
    redirect(`/login?next=/admin`);
  }
  if (!isAdminEmail(user.email)) {
    // non-admins go to their profile
    redirect('/profile');
  }

  // 2) Load dashboard data (defensively—works even if some tables are missing)
  let clients: Array<{ id: string; email: string | null; full_name: string | null }> = [];
  let projects: Array<{ id: string; name: string | null; client_id: string | null; created_at: string | null }> = [];
  let dataError: string | null = null;

  try {
    // List clients from profiles (role='client')
    const { data: clientRows, error: clientErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'client')
      .order('full_name', { ascending: true });

    if (clientErr) throw clientErr;
    clients = (clientRows || []).map((r: any) => ({
      id: r.id,
      email: r.email ?? null,
      full_name: r.full_name ?? null,
    }));

    // List latest projects if your schema has a "projects" table
    const { data: projectRows, error: projectErr } = await supabase
      .from('projects')
      .select('id, name, client_id, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!projectErr && projectRows) {
      projects = projectRows as any[];
    }
  } catch (e: any) {
    dataError = e?.message || 'Failed to load admin data';
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        <header className="flex items-start md:items-center md:flex-row flex-col gap-3 md:gap-0 justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Admin • Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Signed in as <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              My Profile
            </Link>
            <Link
              href="/auth/signout"
              className="inline-flex items-center rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Sign out
            </Link>
          </div>
        </header>

        {/* Quick actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            href="/admin/projects/new"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
          >
            <h3 className="font-medium text-slate-900">New Project</h3>
            <p className="text-sm text-slate-600 mt-1">Create a project and attach assets</p>
          </Link>
          <Link
            href="/admin/clients"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
          >
            <h3 className="font-medium text-slate-900">Manage Clients</h3>
            <p className="text-sm text-slate-600 mt-1">View and edit all client accounts</p>
          </Link>
          <Link
            href="/admin/invites"
            className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
          >
            <h3 className="font-medium text-slate-900">Invites</h3>
            <p className="text-sm text-slate-600 mt-1">Track pending invitations</p>
          </Link>
        </section>

        {/* Create Client */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Create & Invite a Client</h2>
          <CreateClientForm />
          <p className="text-xs text-slate-500 mt-2">
            This creates an Auth user (service-role), sends an invite, and upserts a row in <code>profiles</code>.
          </p>
        </section>

        {/* Data load error */}
        {dataError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 mb-8">
            {dataError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clients */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Clients</h2>
              <span className="text-sm text-slate-500">{clients.length} total</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {clients.length === 0 ? (
                <div className="p-6 text-slate-600">No clients yet.</div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {clients.map((c) => (
                    <li key={c.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{c.full_name || 'Unnamed client'}</div>
                        <div className="text-sm text-slate-600">{c.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/clients/${c.id}`}
                          className="text-sky-600 hover:text-sky-700 text-sm font-medium"
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Projects */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
              <Link href="/admin/projects" className="text-sm text-sky-600 hover:text-sky-700 font-medium">
                View all
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              {projects.length === 0 ? (
                <div className="p-6 text-slate-600">No projects found.</div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {projects.map((p) => (
                    <li key={p.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{p.name || 'Untitled project'}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                          </div>
                        </div>
                        <Link
                          href={`/admin/projects/${p.id}`}
                          className="text-sky-600 hover:text-sky-700 text-sm font-medium"
                        >
                          Open
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

