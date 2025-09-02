'use client'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  title: string
  kind?: string | null
  mime?: string | null           // optional; we’ll also guess from extension
  storagePath?: string | null    // e.g. 'projectId/123-file.tif'
  sketchfabUrl?: string | null   // e.g. https://sketchfab.com/models/<uid> or iframe
}

/** Normalize many Sketchfab variants (URL, iframe, raw UID) → https://sketchfab.com/models/<uid> */
function normalizeSketchfabUrl(input: string): string | null {
  if (!input) return null
  const raw = input.trim()
  const iframeSrc = raw.match(/<iframe[^>]*\s+src=["']([^"']+)["']/i)?.[1]
  const candidate = (iframeSrc || raw).trim()

  if (/^[a-z0-9]{24,}$/i.test(candidate)) return `https://sketchfab.com/models/${candidate}`

  const maybeUidInString = candidate.match(/[a-z0-9]{24,}/i)?.[0] ?? null
  try {
    const u = new URL(candidate)
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf('models')
    if (idx >= 0 && parts[idx + 1] && /^[a-z0-9]{20,}$/i.test(parts[idx + 1])) {
      return `https://sketchfab.com/models/${parts[idx + 1]}`
    }
    const last = parts[parts.length - 1] || ''
    const slugUid = last.replace(/.*-/, '')
    if (/^[a-z0-9]{20,}$/i.test(slugUid)) {
      return `https://sketchfab.com/models/${slugUid}`
    }
    const qUid = u.searchParams.get('model')
    if (qUid && /^[a-z0-9]{20,}$/i.test(qUid)) {
      return `https://sketchfab.com/models/${qUid}`
    }
    if (maybeUidInString) {
      return `https://sketchfab.com/models/${maybeUidInString}`
    }
  } catch { /* not a URL */ }

  return null
}

/** Given normalized model URL or raw input → proper /embed src */
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
  return uid ? `https://sketchfab.com/models/${uid}/embed?autostart=1&ui_infos=0&ui_watermark=0` : null
}

function extFromPath(path?: string | null): string {
  if (!path) return ''
  const m = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?.*)?$/)
  return m?.[1] || ''
}

function guessMime(storagePath?: string | null, provided?: string | null): string {
  if (provided) return provided
  const ext = extFromPath(storagePath)
  if (['jpg','jpeg','png','gif','webp','tif','tiff'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  if (['mp4','webm','mov','m4v','ogv'].includes(ext)) return `video/${ext}`
  if (ext === 'pdf') return 'application/pdf'
  return 'application/octet-stream'
}

export default function AssetCard({ title, kind, mime, storagePath, sketchfabUrl }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const normalizedSketchfab = useMemo(() => (sketchfabUrl ? normalizeSketchfabUrl(sketchfabUrl) : null), [sketchfabUrl])
  const embedSrc = useMemo(() => (normalizedSketchfab ? sketchfabEmbedSrc(normalizedSketchfab) : null), [normalizedSketchfab])

  const finalMime = useMemo(() => guessMime(storagePath, mime || null), [storagePath, mime])
  const isImage = finalMime.startsWith('image/')
  const isVideo = finalMime.startsWith('video/')
  const isPdf   = finalMime === 'application/pdf'

  // Get a short-lived URL for storage files
  useEffect(() => {
    let alive = true
    async function go() {
      if (!storagePath) return
      const res = await fetch(`/api/signed-url?path=${encodeURIComponent(storagePath)}`)
      const j = await res.json().catch(() => ({}))
      if (alive) setSignedUrl(j?.url || null)
    }
    go()
    return () => { alive = false }
  }, [storagePath])

  // Sketchfab embed takes precedence if present
  if (normalizedSketchfab) {
    return (
      <div className="rounded-xl border p-4 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{title}</div>
          {kind && <div className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">{kind}</div>}
        </div>
        {embedSrc ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              title={title}
              src={embedSrc}
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : (
          <div className="text-sm text-red-600">
            Couldn’t parse Sketchfab URL.{' '}
            <a href={normalizedSketchfab} target="_blank" className="text-blue-600 underline">Open on Sketchfab</a>
          </div>
        )}
      </div>
    )
  }

  // File previews (Storage)
  return (
    <div className="rounded-xl border p-4 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-gray-600">{kind || finalMime}</div>
      </div>

      {isImage && signedUrl && (
        <img src={signedUrl} alt={title} className="max-h-[60vh] w-auto rounded-lg border" />
      )}

      {isVideo && signedUrl && (
        <video src={signedUrl} controls className="w-full rounded-lg border" />
      )}

      {isPdf && signedUrl && (
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg border">
          <iframe src={signedUrl} className="h-full w-full border-0" />
        </div>
      )}

      {(!signedUrl && storagePath) && (
        <div className="text-sm text-gray-600">Generating link…</div>
      )}

      {signedUrl && !isImage && !isVideo && !isPdf && (
        <a
          href={signedUrl}
          target="_blank"
          className="inline-block rounded-md bg-gray-900 px-3 py-2 text-white text-sm"
        >
          Download / Open
        </a>
      )}
    </div>
  )
}

