// app/admin/upload/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';

type Project = { id: string; title: string }
type Kind = 'pdf' | 'image' | 'video' | 'orthomosaic' | 'model' | 'other'

export default function UploadPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [kind, setKind] = useState<Kind>('pdf')
  const [sketchfabUrl, setSketchfabUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  // Load projects for the dropdown
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('projects').select('id,title').order('created_at', { ascending: false })
      if (error) console.error(error)
      else setProjects(data || [])
    })()
  }, [])

  async function handleUpload() {
    try {
      setMsg('')
      if (!projectId) return setMsg('Select a project.')
      if (kind !== 'model' && !file) return setMsg('Choose a file to upload.')
      if (kind === 'model' && !sketchfabUrl) return setMsg('Paste a Sketchfab /embed URL for the model.')

      setBusy(true)

      let filePath: string | null = null
      let sizeMb: number | null = null

      // For non-model kinds we upload a file to the private bucket
      if (kind !== 'model' && file) {
        const safeName = file.name.replace(/\s+/g, '-')
        filePath = `${projectId}/${Date.now()}-${safeName}`
        sizeMb = +(file.size / (1024 * 1024)).toFixed(2)

        const { error: upErr } = await supabase.storage.from('deliverables').upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })
        if (upErr) {
          console.error(upErr)
          setMsg('❌ ' + upErr.message)
          return
        }
      }

      // Insert asset row so it shows on the project page
      const { error: assetErr } = await supabase.from('assets').insert({
        project_id: projectId,
        kind,
        title: kind === 'model' ? (sketchfabUrl.split('/').at(-1) || '3D Model') : (file?.name || 'File'),
        url: filePath,                    // path inside bucket
        sketchfab_url: kind === 'model' ? sketchfabUrl : null,
        size_mb: sizeMb,
      })

      if (assetErr) {
        console.error(assetErr)
        setMsg('❌ ' + assetErr.message)
        return
      }

      setMsg(
        kind === 'model'
          ? '✅ Model linked. It will appear on the project page.'
          : `✅ Uploaded to: ${filePath}`
      )
      setFile(null)
      setSketchfabUrl('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Upload Deliverable</h1>

        <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
          {/* Project */}
          <label className="block text-sm text-gray-600">Project</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          {/* Kind */}
          <label className="block text-sm text-gray-600">Kind</label>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            <option value="pdf">PDF</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="orthomosaic">Orthomosaic</option>
            <option value="model">3D Model (Sketchfab)</option>
            <option value="other">Other</option>
          </select>

          {/* If model: show Sketchfab URL field; otherwise show File input */}
          {kind === 'model' ? (
            <>
              <label className="block text-sm text-gray-600">Sketchfab /embed URL</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                placeholder="https://sketchfab.com/models/.../embed"
                value={sketchfabUrl}
                onChange={(e) => setSketchfabUrl(e.target.value)}
              />
            </>
          ) : (
            <>
              <label className="block text-sm text-gray-600">File</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={busy || !projectId || (kind !== 'model' && !file) || (kind === 'model' && !sketchfabUrl)}
            className={`mt-2 rounded-lg px-4 py-2 text-white ${
              (busy || !projectId || (kind !== 'model' && !file) || (kind === 'model' && !sketchfabUrl))
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>

          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>

        <p className="text-sm text-gray-600">
          Files upload into the private <b>deliverables</b> bucket at <code>projectId/timestamp-filename</code>. Models save only a Sketchfab embed URL.
        </p>
      </div>
    </main>
  )
}

