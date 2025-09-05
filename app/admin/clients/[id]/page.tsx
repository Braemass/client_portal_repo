'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

/** ---------- Types ---------- */
type Client = {
  id: string;
  name: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};

type Project = {
  id: string;
  title: string | null;
  status?: string | null;
  created_at?: string | null;
};

/** ---------- Config ---------- */
const SOURCE = (process.env.NEXT_PUBLIC_CLIENTS_SOURCE || 'auto').trim() as
  | 'auto'
  | 'clients'
  | 'profiles';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const AVATARS_BUCKET = (process.env.NEXT_PUBLIC_AVATARS_BUCKET || 'avatars').trim();

/** Helpers to build invite links */
function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}
function inviteLink(email: string, next: string) {
  const url = new URL('/login', siteUrl());
  url.searchParams.set('mode', 'signup');
  url.searchParams.set('email', email);
  url.searchParams.set('next', next);
  return url.toString();
}

export default function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  // Next 15: params is a Promise in client components
  const { id } = use(params);

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // auth/current user
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // edit state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function getAuth() {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) {
        setCurrentUserId(data.user?.id ?? null);
        setCurrentUserEmail(data.user?.email ?? null);
      }
    }

    async function fromClients(): Promise<Client | null> {
      const { data, error } = await supabase
        .from('clients')
        .select('id,name,company,email,phone,avatar_url,created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data || null) as Client | null;
    }

    async function fromProfiles(): Promise<Client | null> {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const r: any = data;
      return {
        id: r.id,
        name: r.name ?? r.full_name ?? r.username ?? r.email ?? 'User',
        company: r.company ?? r.organization ?? null,
        email: r.email ?? r.primary_email ?? null,
        phone: r.phone ?? r.mobile ?? null,
        avatar_url: r.avatar_url ?? null,
        created_at: r.created_at ?? null,
      } as Client;
    }

    async function fetchAll() {
      setLoading(true);
      setErr('');
      await getAuth();

      try {
        // Load client
        let c: Client | null = null;
        if (SOURCE === 'clients') c = await fromClients();
        else if (SOURCE === 'profiles') c = await fromProfiles();
        else {
          c = await fromClients();
          if (!c) c = await fromProfiles();
        }
        if (!cancelled) {
          setClient(c);
          if (c) {
            setName(c.name ?? '');
            setCompany(c.company ?? '');
            setEmail(c.email ?? '');
            setPhone(c.phone ?? '');
            setAvatarPreview(null);
            setAvatarFile(null);
          }
        }

        // Load projects
        const { data: projRows, error: projErr } = await supabase
          .from('projects')
          .select('id,title,status,created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        if (projErr) throw new Error(projErr.message);
        if (!cancelled) setProjects((projRows || []) as Project[]);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || 'Failed to load client.');
          setClient(null);
          setProjects([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canEdit = useMemo(() => {
    const isOwner = currentUserId && client && currentUserId === client.id;
    const isAdmin = currentUserEmail && ADMIN_EMAILS.includes(currentUserEmail.toLowerCase());
    return process.env.NODE_ENV !== 'production' || Boolean(isOwner || isAdmin);
  }, [currentUserId, currentUserEmail, client]);

  const initials = useMemo(() => {
    const n = (client?.name || '').trim();
    if (!n) return 'C';
    const bits = n.split(/\s+/).slice(0, 2);
    return bits.map((b) => b[0]?.toUpperCase()).join('') || 'C';
  }, [client?.name]);

  function onPickAvatar(file: File | null) {
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    } else {
      setAvatarPreview(null);
    }
  }

  async function onSave() {
    if (!client) return;
    setSaving(true);
    setErr('');

    try {
      let newAvatarUrl: string | undefined;

      // 1) Upload avatar if chosen
      if (avatarFile) {
        const ext = (avatarFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${client.id}/avatar.${ext}`;
        const { error: upErr } = await supabase
          .storage
          .from(AVATARS_BUCKET)
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw new Error(`[avatars.upload] ${upErr.message}`);
        const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
        newAvatarUrl = pub?.publicUrl;
      }

      // 2) Update row
      if (SOURCE === 'clients') {
        const updates: any = { name, company, email, phone };
        if (newAvatarUrl) updates.avatar_url = newAvatarUrl;
        const { error: updErr } = await supabase.from('clients').update(updates).eq('id', client.id);
        if (updErr) throw new Error(updErr.message);
      } else {
        const updates: any = { full_name: name || null };
        if (newAvatarUrl) updates.avatar_url = newAvatarUrl;
        const { error: updErr } = await supabase.from('profiles').update(updates).eq('id', client.id);
        if (updErr) throw new Error(updErr.message);
      }

      // 3) Refresh local state
      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      setClient((prev) =>
        prev
          ? { ...prev, name, company, email, phone, avatar_url: newAvatarUrl ?? prev.avatar_url }
          : prev
      );
    } catch (e: any) {
      setErr(e?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const inviteHref =
    client?.email ? inviteLink(client.email, `/clients/${id}`) : undefined;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            Back to Clients
          </Link>

          <h1 className="ml-1 text-xl font-semibold sm:text-2xl">
            {client?.name || 'Client'}
            {client?.company ? ` — ${client.company}` : ''}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            {client?.email && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    if (!inviteHref) return;
                    await navigator.clipboard.writeText(inviteHref);
                    alert('Invite link copied');
                  }}
                  className="rounded-lg border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  title={inviteHref}
                >
                  Copy invite
                </button>
                <a
                  className="rounded-lg bg-brand-teal px-3 py-1.5 text-sm text-white hover:opacity-90"
                  href={`mailto:${encodeURIComponent(client.email)}?subject=${encodeURIComponent(
                    'Your StrandAerial portal access'
                  )}&body=${encodeURIComponent(
                    `Hi ${client.name ?? ''},

Here is your secure link to create your password and access your portal:
${inviteHref}

Thanks,
StrandAerial`
                  )}`}
                >
                  Email invite
                </a>
              </>
            )}

            {canEdit &&
              (!editing ? (
                <button
                  onClick={() => {
                    setEditing(true);
                    setName(client?.name ?? '');
                    setCompany(client?.company ?? '');
                    setEmail(client?.email ?? '');
                    setPhone(client?.phone ?? '');
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M3 17.25V21h3.75l11-11.03-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
                  </svg>
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSave}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Errors */}
        {err && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            {err}
          </div>
        )}

        {/* Profile card */}
        <section className="mb-8 rounded-2xl border bg-white p-5 shadow-md">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative">
              {avatarPreview || client?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview || (client?.avatar_url as string)}
                  alt="Avatar"
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                  {initials}
                </div>
              )}

              {canEdit && editing && (
                <label className="mt-2 block cursor-pointer text-xs text-blue-700">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                  />
                  Change photo
                </label>
              )}
            </div>

            {/* Fields */}
            {!editing ? (
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow label="Name" value={client?.name || '—'} />
                <InfoRow label="Company" value={client?.company || '—'} />
                <InfoRow
                  label="Email"
                  value={
                    client?.email ? (
                      <a className="text-blue-600 hover:underline" href={`mailto:${client.email}`}>
                        {client.email}
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
                <InfoRow label="Phone" value={client?.phone || '—'} />
                <InfoRow
                  label="Member since"
                  value={client?.created_at ? new Date(client.created_at).toLocaleDateString() : '—'}
                />
              </div>
            ) : (
              <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <LabeledInput label="Name" value={name} onChange={setName} />
                <LabeledInput label="Company" value={company} onChange={setCompany} />
                <LabeledInput label="Email" value={email} onChange={setEmail} type="email" />
                <LabeledInput label="Phone" value={phone} onChange={setPhone} />
                {/* NOTE: When SOURCE==='profiles', only full_name + avatar_url will persist unless you add columns. */}
              </div>
            )}
          </div>
        </section>

        {/* Projects list */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <div className="text-sm text-gray-600">{projects.length} total</div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border bg-white shadow-md" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-md">
              No projects yet.
              <div className="mt-3">
                <Link
                  href={`/admin/projects/new?client=${encodeURIComponent(id)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />
                  </svg>
                  Create the first project
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/projects/${p.id}`}
                  className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow duration-200 hover:shadow-xl"
                >
                  <div className="p-4">
                    <div className="mb-1 line-clamp-1 text-base font-medium">
                      {p.title || 'Untitled Project'}
                    </div>
                    <div className="text-xs text-gray-700">{p.status || '—'}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-700">
                    View project →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/** ---------- Small UI helpers ---------- */
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <input
        type={type}
        className="w-full rounded-lg border bg-white px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

