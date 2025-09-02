'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Project = { id: string; title: string }
type Asset = {
  id: string
  project_id: string
  title: string
  kind: 'pdf' | 'image' | 'video' | 'orthomosaic' | 'model' | 'other'
  url: string | null
  sketchfab_url: string | null
}

export default function AdminAssetsManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string>('')

  // inline-rename state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState<string>('')

  // delete busy state
  const [busyId, setBusyId] = useState<string | null>(null)

  // Load projects once
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id,title')
        .order('created_at', { ascending: false })
      if (!error) setProjects(data || [])
    })()
  }, [])

  // Load assets whenever project changes
  useEffect(() => {
    ;(async () => {
      setMsg('')
      if (!projectId) { setAssets([]); return }
      setLoading(true)
      const { data, error } = await supabase
        .from('assets')
        .select('id,project_id,title,kind,url,sketchfab_url')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) setMsg('❌ ' + error.message)
      setAssets(data || [])
      setLoading(false)
    })()
  }, [projectId])

  function beginEdit(a: Asset) {
    setEditingId(a.id)
    setNewTitle(a.title)
    setMsg('')
  }

  async function saveEdit(a: Asset) {
    if (!editingId) return
    const trimmed = newTitle.trim()
    if (!trimmed || trimmed === a.title) {
      setEditingId(null)
      return
    }
    try {
      const { error } = await supabase
        .from('assets')
        .update({ title: trimmed })
        .eq('id', a.id)
      if (error) throw error
      setAssets(prev => prev.map(x => (x.id === a.id ? { ...x, title: trimmed } : x)))
      setMsg('✅ Renamed')
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || 'Rename failed'))
    } finally {
      setEditingId(null)
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setNewTitle('')
  }

  async function deleteAsset(a: Asset) {
    if (!confirm(`Delete asset "${a.title}"? This will remove the database row${a.url ? ' and the file from storage' : ''}.`)) return
    setBusyId(a.id); setMsg('')
    try {
      // Remove file from storage first (if there is a file key)
      if (a.url) {
        const { error: storageErr } = await supabase
          .storage
          .from('deliverables')
          .remove([a.url])
        if (storageErr) throw storageErr
      }
      // Remove DB row
      const { error } = await supabase.from('assets').delete().eq('id', a.id)
      if (error) throw error
      setAssets(prev => prev.filter(x => x.id !== a.id))
      setMsg('✅ Deleted')
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || 'Delete failed'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Assets Manager</h1>

        <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
          <label className="block text-sm text-gray-600">Project</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {projectId && (
          <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
            <div className="text-sm text-gray-600">
              {loading ? 'Loading assets…' : `Assets: ${assets.length}`}
            </div>

            <ul className="grid gap-3">
              {assets.map(a => (
                <li key={a.id} className="rounded-xl border p-4 flex items-center justify-between">
                  {/* Left: title + meta */}
                  <div className="min-w-0">
                    {/* Title (double-click to edit) */}
                    {editingId === a.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="w-full max-w-md rounded border px-2 py-1"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onBlur={() => saveEdit(a)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit(a)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          autoFocus
                        />
                        <button
                          onClick={() => saveEdit(a)}
                          className="rounded-md bg-blue-600 px-3 py-1 text-white text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-md bg-gray-300 px-3 py-1 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        className="font-medium cursor-text truncate"
                        title='Double-click to rename'
                        onDoubleClick={() => beginEdit(a)}
                      >
                        {a.title}
                      </div>
                    )}

                    {/* Meta */}
                    <div className="text-sm text-gray-500 truncate">
                      {a.kind}
                      {a.sketchfab_url ? ' • model (Sketchfab)' : ''}
                      {a.url ? ` • ${a.url}` : ''}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {a.sketchfab_url && (
                      <a
                        className="rounded-md bg-blue-600 px-3 py-1 text-white text-sm"
                        href={a.sketchfab_url}
                        target="_blank"
                      >
                        Open Model
                      </a>
                    )}
                    {a.url && (
                      <button
                        onClick={async () => {
                          // temporary download via signed URL
                          const res = await fetch(`/api/signed-url?path=${encodeURIComponent(a.url!)}`)
                          const j = await res.json()
                          if (j?.url) window.open(j.url, '_blank')
                        }}
                        className="rounded-md bg-gray-900 px-3 py-1 text-white text-sm"
                      >
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => deleteAsset(a)}
                      disabled={busyId === a.id}
                      className={`rounded-md px-3 py-1 text-white text-sm ${busyId === a.id ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      {busyId === a.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </li>
              ))}

              {!loading && assets.length === 0 && (
                <li className="text-gray-600">No assets for this project.</li>
              )}
            </ul>

            {msg && <p className="text-sm mt-2">{msg}</p>}
          </div>
        )}
      </div>
    </main>
  )
}

