import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // server-only
)

export async function POST(req: NextRequest) {
  try {
    const { projectId, filename } = await req.json()
    if (!projectId || !filename) {
      return NextResponse.json({ error: 'Missing projectId or filename' }, { status: 400 })
    }
    const safe = String(filename).replace(/\s+/g, '_')
    const path = `${projectId}/${Date.now()}-${safe}`

    const { data, error } = await supa.storage
      .from('deliverables')
      .createSignedUploadUrl(path)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ path, token: data.token })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

function guessContentType(name: string) {
  const ext = name.toLowerCase().split('.').pop() || ''
  if (['tif','tiff'].includes(ext)) return 'image/tiff'
  if (ext === 'pdf') return 'application/pdf'
  if (['jpg','jpeg','png','webp','gif'].includes(ext)) return `image/${ext==='jpg'?'jpeg':ext}`
  if (['mp4','webm','mov','m4v','ogv'].includes(ext)) return `video/${ext}`
  return 'application/octet-stream'
}

