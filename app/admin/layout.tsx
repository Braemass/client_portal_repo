'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession' // <-- Option A hook

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading } = useSupabaseSession()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !session) {
      const from = encodeURIComponent(pathname || '/admin')
      router.replace(`/login?from=${from}`)
    }
  }, [loading, session, pathname, router])

  // While checking auth, or after triggering redirect
  if (loading || !session) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-gray-600">Checking access…</div>
      </main>
    )
  }

  // Authenticated layout shell for all /admin/* pages
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-4">
          <Link href="/admin" className="font-semibold">Admin</Link>
          <nav className="flex items-center gap-3 text-sm text-gray-700">
            <Link href="/admin/projects">Projects</Link>
            <Link href="/admin/clients">Clients</Link>
            <Link href="/admin/upload">Upload</Link>
            <Link href="/admin/invoices">Invoices</Link>
          </nav>
          <div className="ml-auto text-sm text-gray-600">
            {session.user?.email}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </section>
    </main>
  )
}

