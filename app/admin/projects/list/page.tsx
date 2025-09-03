'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  id: string
  title: string
  created_at: string
  client: { name: string | null; email: string | null } | null
}

export default function AdminProjectList() {
  const [rows, setRows] = useState<Row[]>([])
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      setLoading(true); setErr('')
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,created_at, profiles:client_id(name,email)')
        .order('created_at', { ascending: false })
      if (error) setErr(error.message)
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        created_at: r.created_at,
        client: r.profiles ? { name: r.profiles.name, email: r.profiles.email } : null,
      })) as Row[]
      setRows(mapped)
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    if (!qq) return rows
    return rows.filter(r =>
      r.title.toLowerCase().includes(qq) ||
      r.id.toLowerCase().includes(qq) ||
      (r.client?.email?.toLowerCase().includes(qq) ?? false) ||
      (r.client?.name?.toLowerCase().includes(qq) ?? false)
    )
  }, [rows, q])

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 1200)
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Projects (UUID List)</h1>
          <Link href="/admin/projects/new" className="rounded-lg bg-blue-600 px-4 py-2 text-white">
            New Project
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow flex flex-wrap items-center gap-3">
          <input
            className="w-full md:w-80 rounded-lg border px-3 py-2"
            placeholder="Search by title, UUID, client…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="ml-auto text-sm text-gray-600">
            {filtered.length} of {rows.length}
          </div>
        </div>

        {err && <div className="rounded-xl border bg-red-50 p-3 text-red-700">{err}</div>}
        {loading ? (
          <div className="rounded-xl border bg-white p-4">Loading…</div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-medium truncate">{r.title}</div>
                    <div className="text-sm text-gray-500">
                      UUID: <code className="break-all">{r.id}</code>
                    </div>
                    <div className="text-sm text-gray-500">
                      {r.client?.name || 'Unknown Client'}
                      {r.client?.email ? <> • {r.client.email}</> : null}
                      {' '}• Created {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copy(r.id)}
                      className="rounded-md bg-gray-900 px-3 py-1 text-white text-sm"
                      title="Copy project UUID"
                    >
                      {copied === r.id ? 'Copied!' : 'Copy UUID'}
                    </button>
                    <button
                      onClick={() => copy(`project_id: ${r.id}`)}
                      className="rounded-md bg-blue-600 px-3 py-1 text-white text-sm"
                      title="Copy for Stripe metadata"
                    >
                      Copy “project_id” value
                    </button>
                    <Link
                      href={`/admin/projects/${r.id}`}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                      title="View project page"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/projects/${r.id}`}
                      className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                      title="Edit project"
                    >
                      Edit
                    </Link>
                    {/* 👇 New: one-click upload */}
                    <Link
                      href={`/admin/projects/${r.id}/upload`}
                      className="rounded-md bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700"
                      title="Upload deliverables (files, models, orthos)"
                    >
                      Upload
                    </Link>
			<Link
  href={`/admin/projects/${r.id}?mode=client`}
  className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
  title="Client preview"
>
  View as client
</Link>

                  </div>
                </div>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="rounded-xl border bg-white p-4 text-gray-600">No projects found.</li>
            )}
          </ul>
        )}
      </div>
    </main>
  )
}

