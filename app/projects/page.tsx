'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Project = {
  id: string
  title: string
  status: string | null
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setErr('')
      const { data, error } = await supabase
        .from('projects')
        .select('id,title,status')
        .order('created_at', { ascending: false })

      if (error) setErr(error.message)
      else setProjects(data || [])
      setLoading(false)
    })()
  }, [])

  if (loading) return <div className="p-6">Loading projects…</div>
  if (err) return <div className="p-6 text-red-600">Error: {err}</div>

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <ul className="grid gap-3">
          {projects.map((p) => (
            <li key={p.id} className="rounded-xl border p-4 bg-white">
              <Link href={`/admin/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
                {p.title}
              </Link>
              {p.status && <div className="text-sm text-gray-500">Status: {p.status}</div>}
            </li>
          ))}
        </ul>
        {projects.length === 0 && <p className="text-gray-600">No projects yet.</p>}
      </div>
    </main>
  )
}

