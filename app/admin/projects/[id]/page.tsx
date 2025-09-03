'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';

type Project = { id: string; title: string; status: string }

export default function EditProject() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [p, setP] = useState<Project | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('Active')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id,title,status').eq('id', id).single()
      if (data) { setP(data); setTitle(data.title); setStatus(data.status) }
    })()
  }, [id])

  async function save() {
    setMsg('')
    const { error } = await supabase.from('projects').update({ title, status }).eq('id', id)
    setMsg(error ? '❌ ' + error.message : '✅ Saved')
  }

  async function destroy() {
    if (!confirm('Delete project? This removes assets + files.')) return
    setMsg('Deleting…')
    const res = await fetch(`/api/admin/projects/${id}/delete`, { method: 'POST' })
    const j = await res.json()
    if (res.ok) {
      setMsg('✅ Deleted'); router.push("/admin/projects')
    } else {
      setMsg('❌ ' + (j.error || 'Failed'))
    }
  }

  if (!p) return <div className="p-6">Loading…</div>

  return (
    <main className="p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Edit Project</h1>
        <div className="rounded-2xl border bg-white p-4 shadow space-y-3">
          <label className="block text-sm text-gray-600">Title</label>
          <input className="w-full rounded-lg border px-3 py-2" value={title} onChange={e=>setTitle(e.target.value)} />
          <label className="block text-sm text-gray-600">Status</label>
          <select className="w-full rounded-lg border px-3 py-2" value={status} onChange={e=>setStatus(e.target.value)}>
            <option>Active</option>
            <option>On Hold</option>
            <option>Completed</option>
          </select>
          <div className="flex gap-2">
            <button onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Save</button>
            <button onClick={destroy} className="rounded-lg bg-red-600 px-4 py-2 text-white ml-auto">Delete Project</button>
          </div>
          {msg && <p className="text-sm mt-2">{msg}</p>}
        </div>
        <a className="text-blue-600" href={`/admin/projects/${id}`}>View project page →</a>
      </div>
    </main>
  )
}

