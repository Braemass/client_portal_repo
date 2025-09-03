'use client'
import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession' // <-- Opti$


type Project = {
  id: string
  title: string
  status: string | null
  created_at: string
  client: { name: string | null; email: string | null } | null
}

export default function AdminDashboard() {
  const [rows, setRows] = useState<Project[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      setLoading(true); setErr('')
      // If you have projects.client_id -> profiles.id FK, this join works.
      // Otherwise change to .select('id,title,status,created_at') and remove client display.
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,status,created_at, profiles:client_id(name,email)')
        .order('created_at', { ascending: false })

      if (error) setErr(error.message)
      else {
        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          status: r.status,
          created_at: r.created_at,
          client: r.profiles ? { name: r.profiles.name, email: r.profiles.email } : null,
        })) as Project[]
        setRows(mapped)
      }
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r =>
      r.title.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s) ||
      (r.client?.email?.toLowerCase().includes(s) ?? false) ||
      (r.client?.name?.toLowerCase().includes(s) ?? false) ||
      (r.status ?? '').toLowerCase().includes(s)
    )
  }, [rows, q])

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Link href="/admin/projects/new" className="rounded-lg bg-blue-600 px-4 py-2 text-white">New Project</Link>
            <Link href="/admin/clients/new" className="rounded-lg border px-4 py-2 hover:bg-gray-50">New Client</Link>
          </div>
        </header>

        <div className="rounded-2xl border bg-white p-4 shadow flex flex-wrap items-center gap-3">
          <input
            className="w-full md:w-80 rounded-lg border px-3 py-2"
            placeholder="Search by title, UUID, client, status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="ml-auto text-sm text-gray-600">{filtered.length} of {rows.length}</div>
        </div>

        {err && <div className="rounded-xl border bg-red-50 p-3 text-red-700">{err}</div>}

        {loading ? (
          <div className="rounded-xl border bg-white p-4">Loading…</div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((p) => (
              <li key={p.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-medium truncate">{p.title}</div>
                    <div className="text-sm text-gray-500">
                      UUID: <code className="break-all">{p.id}</code>
                      {p.status ? <> • Status: {p.status}</> : null}
                      <> • Created {new Date(p.created_at).toLocaleString()}</>
                      {p.client ? <> • {p.client.name || 'Client'} {p.client.email ? `(${p.client.email})` : ''}</> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                      title="View project page"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                      title="Edit project"
                    >
                      Edit
                    </Link>
                    {/* ✅ Upload button per project */}
                    <Link
                      href={`/admin/projects/${p.id}/upload`}
                      className="rounded-md bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700"
                      title="Upload deliverables (files, models, orthos)"
                    >
                      Upload
                    </Link>
			<Link
  href={`/admin/projects/${p.id}?mode=client`}
  className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
  title="Open project page exactly how a client sees it (UI-only)"
>
  View as client
</Link>

                  </div>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="rounded-xl border bg-white p-4 text-gray-600">No projects match this search.</li>
            )}
          </ul>
        )}
      </div>
    </main>
  )
}

