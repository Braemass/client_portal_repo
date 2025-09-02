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
type Project = { id: string; title: string }

const ACTIVE_STATUSES = ['due','overdue','open','unpaid','pending'] as const
type Filter = 'all' | 'active' | 'due' | 'overdue' | 'paid' | 'draft'

export default function AdminInvoices() {
  const [filter, setFilter] = useState<Filter>('active')
  const [rows, setRows] = useState<Invoice[]>([])
  const [projectsById, setProjectsById] = useState<Record<string, Project>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  // preload projects map
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('projects').select('id,title')
      if (!error && data) {
        const map = Object.fromEntries(data.map(p => [p.id, p]))
        setProjectsById(map)
      }
    })()
  }, [])

  // fetch invoices (grab broadly; filter in code to be robust to differing status vocab)
  useEffect(() => {
    (async () => {
      setLoading(true); setErr('')
      const { data, error } = await supabase
        .from('invoices')
        .select('id, project_id, status, amount_cents, stripe_invoice_url, due_date')
        .order('due_date', { ascending: true, nullsLast: true })
      if (error) setErr(error.message)
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'active') {
      return rows.filter(r => r.status && ACTIVE_STATUSES.includes(r.status.toLowerCase() as any))
    }
    return rows.filter(r => (r.status || '').toLowerCase() === filter)
  }, [rows, filter])

  async function markPaid(id: string) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status: 'paid' } : r)))
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>

        <div className="rounded-2xl border bg-white p-4 shadow flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">Filter:</span>
          <select
            className="rounded-lg border px-3 py-2"
            value={filter}
            onChange={e => setFilter(e.target.value as Filter)}
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
            {filtered.map(inv => {
              const pr = projectsById[inv.project_id]
              const amount = ((inv.amount_cents ?? 0) / 100).toFixed(2)
              const status = (inv.status || '').toUpperCase()
              return (
                <li key={inv.id} className="rounded-xl border bg-white p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      ${amount} • {status || 'UNKNOWN'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Project:{' '}
                      {pr ? (
                        <a className="text-blue-600" href={`/projects/${pr.id}`}>{pr.title}</a>
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

