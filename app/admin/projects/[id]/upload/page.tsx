'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { StorageClient } from '@supabase/storage-js' // <-- now guaranteed to be the ESM build via alias

type Kind = 'orthomosaic' | 'model' | 'report' | 'photo' | 'video' | 'other'

// ---------- dedicated Storage client (avoid any shadowed/older client) ----------
const storage = new StorageClient(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`,
  {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
  }
)

/* ========================= Sketchfab helpers ========================= */

function normalizeSketchfabUrl(input: string): string | null {
  if (!input) return null
  const raw = input.trim()
  const iframeSrc = raw.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i)?.[1]
  const candidate = (iframeSrc || raw).trim()
  if (/^[a-z0-9]{24,}$/i.test(candidate)) return `https://sketchfab.com/models/${candidate}`
  const maybeUid = candidate.match(/[a-z0-9]{24,}/i)?.[0] ?? null
  try {
    const u = new URL(candidate)
    const parts = u.pathname.split('/').filter(Boolean)
    const i = parts.indexOf('models')
    if (i >= 0 && parts[i + 1] && /^[a-z0-9]{20,}$/i.test(parts[i + 1])) return `https://sketchfab.com/models/${parts[i + 1]}`
    const last = parts[parts.length - 1] || ''
    const slugUid = last.replace(/.*-/, '')
    if (/^[a-z0-9]{20,}$/i.test(slugUid)) return `https://sketchfab.com/models/${slugUid}`
    const q = u.searchParams.get('model')
    if (q && /^[a-z0-9]{20,}$/i.test(q)) return `https://sketchfab.com/models/${q}`
    if (maybeUid) return `https://sketchfab.com/models/${maybeUid}`
  } catch {}
  return null
}

function sketchfabEmbedSrc(input: string): string | null {
  if (!input) return null
  const fromIframe = input.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i)?.[1]
  const candidate = (fromIframe || input).trim()
  try {
    const u = new URL(candidate)
    if (/\/models\/[a-z0-9]{20,}\/embed/i.test(u.pathname)) return candidate
  } catch {}
  const norm = normalizeSketchfabUrl(candidate)
  if (!norm) return null
  const uid = norm.split('/').filter(Boolean).pop()
  return uid ? `https://sketchfab.com/models/${uid}/embed?autostart=0&ui_infos=0&ui_watermark=0` : null
}

/* ========================= Multipart helpers ========================= */

const CHUNK_SIZE = 8 * 1024 * 1024 // 8MB per part
const MULTIPART_THRESHOLD = 200 * 1024 * 1024 // >200MB => multipart

async function createMultipart(path: string, contentType: string) {
  const { data, error } = await storage
    .from('deliverables')
    .createMultipartUpload(path, { upsert: false, contentType })
  if (error) throw error
  return data as { uploadId: string; path: string }
}

async function uploadPart(path: string, uploadId: string, partNumber: number, chunk: Blob) {
  const { data, error } = await storage
    .from('deliverables')
    .uploadPart(path, uploadId, partNumber, chunk)
  if (error) throw error
  return data as { ETag: string }
}

async function completeMultipart(
  path: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
) {
  const { data, error } = await storage
    .from('deliverables')
    .completeMultipartUpload(path, uploadId, parts)
  if (error) throw error
  return data
}

async function uploadLargeMultipart(
  projectId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ path: string; contentType: string }> {
  const safe = file.name.replace(/\s+/g, '_')
  const path = `${projectId}/${Date.now()}-${safe}`
  const contentType = file.type || 'application/octet-stream'

  const { uploadId } = await createMultipart(path, contentType)

  const parts: { partNumber: number; etag: string }[] = []
  const total = file.size
  let uploaded = 0
  let partNumber = 1

  for (let start = 0; start < total; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE, total)
    const chunk = file.slice(start, end)
    const { ETag } = await uploadPart(path, uploadId, partNumber, chunk)
    parts.push({ partNumber, etag: ETag })
    uploaded = end
    if (onProgress && total > 0) onProgress(Math.round((uploaded / total) * 100))
    partNumber++
  }

  await completeMultipart(path, uploadId, parts)
  return { path, contentType }
}

/* ========================= Page ========================= */

export default function UploadDeliverables() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()

  const [files, setFiles] = useState<FileList | null>(null)
  const [largeFile, setLargeFile] = useState<File | null>(null)
  const [lfProgress, setLfProgress] = useState<number>(0)

  const [kind, setKind] = useState<Kind>('orthomosaic')
  const [title, setTitle] = useState('')

  const [sketchfabInput, setSketchfabInput] = useState('')
  const sketchfabUrl = useMemo(() => normalizeSketchfabUrl(sketchfabInput), [sketchfabInput])
  const previewSrc = useMemo(() => (sketchfabUrl ? sketchfabEmbedSrc(sketchfabUrl) : null), [sketchfabUrl])

  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Verify the methods exist at runtime (once)
  useEffect(() => {
    const b: any = storage.from('deliverables')
    console.log(
      'multipart methods:',
      typeof b.createMultipartUpload,
      typeof b.uploadPart,
      typeof b.completeMultipartUpload
    )
    if (
      typeof b.createMultipartUpload !== 'function' ||
      typeof b.uploadPart !== 'function' ||
      typeof b.completeMultipartUpload !== 'function'
    ) {
      console.error('Multipart API NOT visible. Check next.config.mjs alias and reinstall.')
    }
  }, [])

  useEffect(() => { if (!projectId) router.replace('/admin') }, [projectId, router])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')

    if (!projectId) return

    const haveNormal = !!(files && files.length > 0)
    const haveLarge  = !!largeFile
    const haveSf     = !!sketchfabUrl

    if (!haveNormal && !haveLarge && !haveSf) {
      setMsg('❌ Choose files, a large TIFF/OBJ, or paste a valid Sketchfab URL/embed.')
      return
    }

    setBusy(true)
    setMsg('Uploading… keep this tab open.')
    try {
      const toInsert: any[] = []

      // Standard picker (auto route big files to multipart)
      if (haveNormal) {
        for (const f of Array.from(files!)) {
          if (f.size > MULTIPART_THRESHOLD) {
            const res = await uploadLargeMultipart(projectId, f)
            toInsert.push({ project_id: projectId, title: title || f.name, kind, url: res.path, sketchfab_url: sketchfabUrl || null })
          } else {
            const safe = f.name.replace(/\s+/g, '_')
            const path = `${projectId}/${Date.now()}-${safe}`
            const { error } = await supabase.storage.from('deliverables').upload(path, f, { upsert: false })
            if (error) throw error
            toInsert.push({ project_id: projectId, title: title || f.name, kind, url: path, sketchfab_url: sketchfabUrl || null })
          }
        }
      }

      // Large picker (always multipart with progress)
      if (haveLarge && largeFile) {
        const res = await uploadLargeMultipart(projectId, largeFile, setLfProgress)
        toInsert.push({ project_id: projectId, title: title || largeFile.name, kind, url: res.path, sketchfab_url: sketchfabUrl || null })
      }

      // Sketchfab-only
      if (!haveNormal && !haveLarge && haveSf && sketchfabUrl) {
        toInsert.push({ project_id: projectId, title: title || '3D Model', kind: 'model', url: null, sketchfab_url: sketchfabUrl })
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('assets').insert(toInsert)
        if (error) throw error
      }

      setMsg(`✅ Saved ${toInsert.length} deliverable(s).`)
      setTimeout(() => router.push(`/projects/${projectId}`), 900)
    } catch (err: any) {
      console.error(err)
      setMsg('❌ ' + (err?.message || 'Upload failed'))
    } finally {
      setBusy(false)
      setLfProgress(0)
    }
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Upload Deliverables</h1>
          <Link href={`/projects/${projectId}`} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Back to Project
          </Link>
        </div>

        <form onSubmit={handleUpload} className="rounded-2xl border bg-white p-5 shadow grid gap-6">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title (optional)</label>
            <input className="w-full rounded-lg border px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Site A – Ortho v2 or 3D Model" />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Kind</label>
            <select className="w-full rounded-lg border px-3 py-2" value={kind} onChange={(e)=>setKind(e.target.value as Kind)}>
              <option value="orthomosaic">Orthomosaic</option>
              <option value="model">3D Model</option>
              <option value="report">Report</option>
              <option value="photo">Photo</option>
              <option value="video">Video</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Standard files (auto-multipart if { '>' }200 MB)</label>
            <input type="file" multiple onChange={(e)=>setFiles(e.target.files)} />
            <p className="text-xs text-gray-500 mt-1">Files larger than ~200 MB auto-switch to multipart to avoid size limits.</p>
          </div>

          <div className="rounded-lg border p-4 bg-gray-50">
            <div className="font-medium mb-2">Large file (TIFF/OBJ) — multipart upload</div>
            <input type="file" onChange={(e)=>setLargeFile(e.target.files?.[0] || null)} />
            {largeFile && <div className="mt-2 text-sm text-gray-600">{largeFile.name} • {(largeFile.size/1024/1024).toFixed(1)} MB</div>}
            {lfProgress > 0 && (
              <div className="mt-3">
                <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                  <div className="h-2 bg-blue-600" style={{ width: `${lfProgress}%` }} />
                </div>
                <div className="text-xs text-gray-600 mt-1">{lfProgress}%</div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">Streams to Storage in chunks and supports multi-hundred MB+ files reliably.</p>
          </div>

          <div className="grid gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sketchfab embed or URL (optional)</label>
              <textarea className="w-full rounded-lg border px-3 py-2 h-24" placeholder='Paste a Sketchfab URL or the full <iframe …> embed' value={sketchfabInput} onChange={(e)=>setSketchfabInput(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1">We’ll extract the model ID and save a clean URL; it embeds on the project page.</p>
            </div>

            <div className="rounded-lg border bg-white p-3">
              <div className="text-sm font-medium mb-2">Sketchfab Preview</div>
              {!sketchfabInput && <div className="text-sm text-gray-500">Paste a Sketchfab URL or iframe to preview.</div>}
              {sketchfabInput && !sketchfabUrl && <div className="text-sm text-red-600">Couldn’t parse the input; try the full embed or the model URL.</div>}
              {previewSrc && (
                <div className="aspect-video w-full overflow-hidden rounded-md bg-black/5">
                  <iframe title="Sketchfab Preview" src={previewSrc} allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen className="h-full w-full border-0" />
                </div>
              )}
              {sketchfabUrl && <div className="text-xs text-gray-600 mt-2">Will save as: <code>{sketchfabUrl}</code></div>}
            </div>
          </div>

          <button type="submit" disabled={busy} className={`rounded-lg px-4 py-2 text-white ${busy ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {busy ? 'Uploading…' : 'Save Deliverables'}
          </button>

          {msg && <div className="text-sm">{msg}</div>}
        </form>
      </div>
    </main>
  )
}
