'use client'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'next/navigation' // 👈 add useSearchParams
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AssetCard from '@/app/components/AssetCard'

type Project = { id: string; title: string; status: string | null }
type Asset = {
  id: string
  title: string
  kind: string | null
  url: string | null
  mime_type: string | null
  sketchfab_url: string | null
}

export default function ProjectView() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const clientMode = useMemo(() => (searchParams?.get('mode') === 'client'), [searchParams]) // 👈

  const [p, setP] = useState<Project | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true); setErr('')
      const { data: proj, error: e1 } = await supabase
        .from('projects')
        .select('id,title,status')
        .eq('id', id)
        .maybeSingle()
      if (e1) { setErr(e1.message); setLoading(false); return }
      if (!proj) { setErr('Project not found'); setLoading(false); return }
      setP(proj)

      const { data: a, error: e2 } = await supabase
        .from('assets')
        .select('id,title,kind,url,mime_type,sketchfab_url')
        .eq('project_id', id)
        .order('created_at', { ascending: false })

      if (e2) setErr(e2.message)
      setAssets(a || [])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <div className="p-6">Loading…</div>
  if (err) return (
    <main className="p-6">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-xl font-semibold">Error</h1>
        <p className="mt-2 text-red-600">{err}</p>
        <Link href="/admin/projects" className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-white">Back to Projects</Link>
      </div>
    </main>
  )
  if (!p) return null

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">
            {p.title}{clientMode ? ' (Client Preview)' : ''}
          </h1>
          <div className="flex gap-2">
            <Link href="/admin/projects" className="rounded-lg border px-3 py-2 hover:bg-gray-50">All Projects</Link>

            {/* Show admin-only controls only when NOT in clientMode */}
            {!clientMode && (
              <>
                <Link href={`/admin/projects/${p.id}/upload`} className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                  Upload Deliverables
                </Link>
                <Link href={`/admin/projects/${p.id}`} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                  Edit
                </Link>
                {/* Quick toggle to preview */}
                <Link href={`/admin/projects/${p.id}?mode=client`} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                  View as client
                </Link>
              </>
            )}

            {/* When already in clientMode, offer exit back to admin view */}
            {clientMode && (
              <Link href={`/admin/projects/${p.id}`} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                Exit client preview
              </Link>
            )}
          </div>
        </div>

        {p.status && <div className="text-sm text-gray-600">Status: {p.status}</div>}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Deliverables</h2>
          {assets.length === 0 ? (
            <div className="rounded-xl border bg-white p-4 text-gray-600">No assets yet.</div>
          ) : (
            <div className="grid gap-4">
              {assets.map(a => (
                <AssetCard
                  key={a.id}
                  title={a.title}
                  kind={a.kind}
                  mime={a.mime_type}
                  storagePath={a.url || undefined}
                  sketchfabUrl={a.sketchfab_url || undefined}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

