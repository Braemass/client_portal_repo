'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Client = {
  id: string;
  name: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
};
type Project = { id: string; title: string | null; status?: string | null; created_at?: string | null };

export default function ProfilePanel({
  initialClient,
  initialProjects,
}: {
  initialClient: Client;
  initialProjects: Project[];
}) {
  const [client, setClient] = useState<Client>(initialClient);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(client.name ?? '');
  const [company, setCompany] = useState(client.company ?? '');
  const [phone, setPhone] = useState(client.phone ?? '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const initials = useMemo(() => {
    const n = (client.name || '').trim();
    if (!n) return 'C';
    const parts = n.split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase()).join('') || 'C';
  }, [client.name]);

  function onPick(file: File | null) {
    setAvatar(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSave() {
    setSaving(true);
    try {
      let avatar_url: string | undefined;
      if (avatar) {
        const ext = (avatar.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${client.id}/avatar.${ext}`;
        const up = await supabase.storage.from('avatars').upload(path, avatar, {
          contentType: avatar.type,
          upsert: true,
        });
        if (up.error) throw up.error;
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = data?.publicUrl;
      }

      // prefer writing to clients; fall back to profiles if needed
      const updates: any = { name, company, phone };
      if (avatar_url) updates.avatar_url = avatar_url;

      let error = null;
      const cUpd = await supabase.from('clients').update(updates).eq('id', client.id);
      if (cUpd.error) error = cUpd.error;

      if (error) {
        const pUpd = await supabase.from('profiles').update({ full_name: name, avatar_url }).eq('id', client.id);
        if (pUpd.error) throw pUpd.error;
      }

      setClient((prev) => ({ ...prev, name, company, phone, avatar_url: avatar_url ?? prev.avatar_url }));
      setEditing(false);
      setAvatar(null);
      setPreview(null);
    } catch (e: any) {
      alert(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border bg-white p-5 shadow-md">
        <div className="flex items-start gap-5">
          <div>
            {preview || client.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview || (client.avatar_url as string)}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-200"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                {initials}
              </div>
            )}
            {editing && (
              <label className="mt-2 block cursor-pointer text-xs text-blue-700">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] || null)} />
                Change photo
              </label>
            )}
          </div>

          {!editing ? (
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Name" value={client.name || '—'} />
              <Info label="Company" value={client.company || '—'} />
              <Info
                label="Email"
                value={
                  client.email ? (
                    <a className="text-blue-600 hover:underline" href={`mailto:${client.email}`}>
                      {client.email}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <Info label="Phone" value={client.phone || '—'} />
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Name" value={name} onChange={setName} />
              <Input label="Company" value={company} onChange={setCompany} />
              <Input label="Phone" value={phone} onChange={setPhone} />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Member since {client.created_at ? new Date(client.created_at).toLocaleDateString() : '—'}
          </div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Edit profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  setAvatar(null);
                  setPreview(null);
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
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Projects</h2>
          <div className="text-sm text-gray-600">{projects.length} total</div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700 shadow-md">
            No projects yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/admin/projects/${p.id}`} // if you want a read-only client view, change this route
                className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-shadow duration-200 hover:shadow-xl"
              >
                <div className="p-4">
                  <div className="mb-1 line-clamp-1 text-base font-medium">{p.title || 'Untitled Project'}</div>
                  <div className="text-xs text-gray-700">{p.status || '—'}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <div className="border-t bg-gray-50 px-4 py-2 text-xs text-gray-700">Open →</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-28 shrink-0 text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function Input({
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

