'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type Project = { id: string; title: string }
type Client  = { id: string; email: string; name: string | null }

export default function AdminSearch() {
  const [q, setQ] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      if (!q.trim()) { setProjects([]); setClients([]); return }
      setLoading(true)
      const [pr, cl] = await Promise.all([
        supabase.from('projects').select('id,title').ilike('title', `%${q}%`).limit(6),
        supabase.from('profiles').select('id,email,name').neq('role','admin')
          .or(`email.ilike.%${q}%,name.ilike.%${q}%`).limit(6)
      ])
      setProjects(pr.data || [])
      setClients(cl.data || [])
      setLoading(false)
    }
    const t = setTimeout(run, 250) // debounce
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="rounded-2xl border bg-white p-4 shadow">
      <div className="flex items-center gap-3">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Search projects or clients…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && <span className="text-sm text-gray-500">Searching…</span>}
      </div>

      {(projects.length > 0 || clients.length > 0) && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Projects</div>
            <ul className="space-y-1">
              {projects.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => router.push(`/projects/${p.id}`)}
                    className="text-left w-full rounded-lg border px-3 py-2 hover:bg-gray-50"
                  >
                    {p.title}
                  </button>
                </li>
              ))}
              {projects.length === 0 && <li className="text-sm text-gray-500">No matches</li>}
            </ul>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Clients</div>
            <ul className="space-y-1">
              {clients.map(c => (
                <li key={c.id}>
                  <button
                    onClick={() => router.push(`/admin/projects/new?client_id=${c.id}`)}
                    className="text-left w-full rounded-lg border px-3 py-2 hover:bg-gray-50"
                  >
                    {c.name ? `${c.name} <${c.email}>` : c.email}
                  </button>
                </li>
              ))}
              {clients.length === 0 && <li className="text-sm text-gray-500">No matches</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

