'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession' // <-- Opti$

type Asset = { id: string; title: string; kind: string; url: string | null; sketchfab_url: string | null }
type Invoice = { id: string; status: string; amount_cents: number; stripe_invoice_url: string | null }

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const session = useSession()
  const [assets, setAssets] = useState<Asset[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [title, setTitle] = useState<string>('Project')

  useEffect(() => {
    if (!session || !id) return
    ;(async () => {
      const pr = await supabase.from('projects').select('title').eq('id', id).single()
      if (pr.data) setTitle(pr.data.title)
      const as = await supabase.from('assets').select('*').eq('project_id', id).order('created_at', { ascending: false })
      setAssets(as.data || [])
      const inv = await supabase.from('invoices').select('*').eq('project_id', id).order('due_date', { ascending: true })
      setInvoices(inv.data || [])
    })()
  }, [session, id])

  async function download(path: string) {
    // call our server route to get a signed URL
    const res = await fetch(`/api/signed-url?path=${encodeURIComponent(path)}`)
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Deliverables</h2>
          <ul className="grid gap-3">
            {assets.map(a => (
              <li key={a.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-gray-500">{a.kind}</div>
                  </div>
                  <div className="flex gap-2">
                    {a.url && <button onClick={() => download(a.url!)} className="rounded-md bg-gray-900 px-3 py-1 text-white text-sm">Download</button>}
                    {a.sketchfab_url && <a href={a.sketchfab_url} target="_blank" className="rounded-md bg-blue-600 px-3 py-1 text-white text-sm">Open Model</a>}
                  </div>
                </div>
              </li>
            ))}
            {assets.length === 0 && <li className="text-gray-600">No assets yet.</li>}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Invoices</h2>
          <ul className="grid gap-3">
            {invoices.map(inv => (
              <li key={inv.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">${(inv.amount_cents/100).toFixed(2)}</div>
                  <div className="text-sm text-gray-500">Status: {inv.status}</div>
                </div>
                {inv.stripe_invoice_url &&
                  <a className="rounded-md bg-purple-600 px-3 py-1 text-white text-sm" target="_blank" href={inv.stripe_invoice_url}>View in Stripe</a>}
              </li>
            ))}
            {invoices.length === 0 && <li className="text-gray-600">No invoices yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  )
}

