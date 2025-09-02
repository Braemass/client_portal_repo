// app/api/admin/projects/[id]/delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use the *service role* on the server (DO NOT expose this key in the browser)
// Required env in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const projectId = params.id
  if (!projectId) {
    return NextResponse.json({ error: 'Missing project id' }, { status: 400 })
  }

  try {
    // 1) Gather asset paths to delete from storage (only those with a file URL)
    const { data: assets, error: assetsErr } = await supa
      .from('assets')
      .select('id,url')
      .eq('project_id', projectId)

    if (assetsErr) throw assetsErr

    const fileKeys = (assets || [])
      .map(a => a.url)
      .filter((u): u is string => Boolean(u))

    // 2) Delete all files from the 'deliverables' bucket (in one call if possible)
    if (fileKeys.length > 0) {
      const { error: storageErr } = await supa.storage.from('deliverables').remove(fileKeys)
      if (storageErr) throw storageErr
    }

    // 3) Delete DB rows (assets → invoices → project)
    const { error: delAssetsErr } = await supa.from('assets').delete().eq('project_id', projectId)
    if (delAssetsErr) throw delAssetsErr

    const { error: delInvoicesErr } = await supa.from('invoices').delete().eq('project_id', projectId)
    if (delInvoicesErr) throw delInvoicesErr

    const { error: delProjectErr } = await supa.from('projects').delete().eq('id', projectId)
    if (delProjectErr) throw delProjectErr

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error('[DELETE PROJECT ERROR]', err)
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 })
  }
}

// (Optional) guard other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
