import Link from 'next/link'
import UserBar from '@/components/UserBar'

export default function Home() {
  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-2xl space-y-4">
        <UserBar/>
        <div className="rounded-2xl border bg-white p-6 shadow">
          <h1 className="text-2xl font-semibold">Client Portal Home</h1>
          <p className="mt-2 text-gray-600">Next: show your projects from Supabase.</p>
          <Link href="/admin/projects" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-white">
            View Projects
          </Link>
        </div>
      </div>
    </main>
  )
}

