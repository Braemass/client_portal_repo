'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Client = { id: string; email: string; name: string | null }

export default function NewProjectPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('Active')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,name')
        .neq('role','admin')                 // show only clients
        .order('email', { ascending: true })
      if (!error) setClients(data || [])
    })()
  }, [])

  async function createProject() {
    setMsg('')
    if (!clientId) return setMsg('Select a client.')
    if (!title.trim()) return setMsg('Enter a title.')
    const { data, error } = await supabase
      .from('projects')
      .insert({ title, status, client_id: clientId })
      .select('id')
      .single()
    if (error) return setMsg('❌ '+error.message)
    setMsg('✅ Project created')
    if (data?.id) location.href = `/projects/${data.id}`
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">New Project</h1>
          <Link className="text-blue-600" href="/projects">Back to Projects</Link>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
          <label className="block text-sm text-gray-600">Title</label>
          <input className="w-full rounded-lg border px-3 py-2"
                 value={title} onChange={e=>setTitle(e.target.value)}
                 placeholder="Subdivision – Phase 2" />

          <label className="block text-sm text-gray-600">Status</label>
          <select className="w-full rounded-lg border px-3 py-2"
                  value={status} onChange={e=>setStatus(e.target.value)}>
            <option>Active</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>

          <label className="block text-sm text-gray-600">Client</label>
          <select className="w-full rounded-lg border px-3 py-2"
                  value={clientId} onChange={e=>setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.name ? `${c.name} <${c.email}>` : c.email}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={createProject}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
            disabled={!title || !clientId}
          >
            Create Project
          </button>

          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>

        <p className="text-sm text-gray-600">
          After creating, upload deliverables at <code>/admin/upload</code>. Files are stored under
          <code> deliverables/&lt;projectId&gt;/&lt;timestamp&gt;-&lt;filename&gt;</code>.
        </p>
      </div>
    </main>
  )
}

