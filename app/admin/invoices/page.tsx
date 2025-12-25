'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Invoice = {
  id: string
  project_id: string
  status: string | null
  amount_cents: number | null
  stripe_invoice_url: string | null
  due_date: string | null
}

type Project = { id: string; title: string | null }

const ACTIVE_STATUSES = ['due', 'overdue', 'open', 'unpaid', 'pending'] as const
type Filter = 'all' | 'active' | 'due' | 'overdue' | 'paid' | 'draft'

export default function AdminInvoices() {
  const [filter, setFilter] = useState<Filter>('active')
  const [rows, setRows] = useState<Invoice[]>([])
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  // preload projects map
  useEffect(() => {
    ;(async () => {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id,title')

      if (!projectsError && projectsData) {
        const map = Object.fromEntries(
          (projectsData as Project[]).map((p: Project) => [p.id, p])
        ) as Record<string, Project>
        setProjectsById(map)
      }
    })()
  }, [])

  // fetch invoices
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setErr('')
      const { data, error } = await supabase
        .from('invoices')
        .select('id, project_id, status, amount_cents, stripe_invoice_url, due_date')
        // v2: use nullsFirst (false => nulls last) or omit it
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) setErr(error.message)
      setRows((data || []) as Invoice[])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'active') {
      const toLower = (s: string | null) => (s ?? '').toLowerCase()
      return rows.filter((r) => {
        const s = toLower(r.status)
        return s && (ACTIVE_STATUSES as readonly string[]).includes(s)
      })
    }
    return rows.filter((r) => (r.status || '').toLowerCase() === filter)
  }, [rows, filter])

  async function markPaid(id: string) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'paid' } : r)))
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 shadow">
          <span className="text-sm text-gray-600">Filter:</span>
          <select
            className="rounded-lg border px-3 py-2"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="active">Active (due/open/unpaid)</option>
            <option value="all">All</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="draft">Draft</option>
          </select>

          <div className="ml-auto text-sm text-gray-600">
            Showing {filtered.length} of {rows.length}
          </div>
        </div>

        {err && <div className="rounded-xl border bg-red-50 p-3 text-red-700">{err}</div>}

        {loading ? (
          <div className="rounded-xl border bg-white p-4">Loading…</div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((inv) => {
              const pr = projectsById[inv.project_id]
              const amount = ((inv.amount_cents ?? 0) / 100).toFixed(2)
              const status = (inv.status || '').toUpperCase()
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-xl border bg-white p-4"
                >
                  <div>
                    <div className="font-medium">
                      ${amount} • {status || 'UNKNOWN'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Project:{' '}
                      {pr ? (
                        <a className="text-blue-600" href={`/admin/projects/${pr.id}`}>
                          {pr.title ?? pr.id}
                        </a>
                      ) : (
                        inv.project_id
                      )}
                      {inv.due_date && <> • Due {new Date(inv.due_date).toLocaleDateString()}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.stripe_invoice_url && (
                      <a
                        className="rounded-md bg-purple-600 px-3 py-1 text-white text-sm"
                        href={inv.stripe_invoice_url}
                        target="_blank"
                      >
                        Stripe
                      </a>
                    )}
                    {(inv.status || '').toLowerCase() !== 'paid' && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        className="rounded-md bg-green-600 px-3 py-1 text-white text-sm"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
            {!loading && filtered.length === 0 && (
              <li className="text-gray-600">No invoices match this filter.</li>
            )}
          </ul>
        )}
      </div>
    </main>
  )
}

