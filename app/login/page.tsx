'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient' // from your @supabase/ssr setup
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession' // Option A hook

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Where to send the user after login
  const from = useMemo(() => {
    const f = searchParams.get('from')
    // basic safety: only allow in-app paths
    return f && f.startsWith('/') ? f : '/admin'
  }, [searchParams])

  const { session, loading } = useSupabaseSession()

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // If already logged in, bounce to the destination
  useEffect(() => {
    if (!loading && session) {
      router.replace(from)
    }
  }, [loading, session, from, router])

  async function sendLink(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      // Redirect back to THIS page with ?from=... after clicking the email link
      const emailRedirectTo = `${location.origin}/login?from=${encodeURIComponent(from)}`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo }
      })
      if (error) throw error
      setSent(true)
    } catch (e: any) {
      setErr(e?.message ?? 'Could not send sign-in link')
    } finally {
      setBusy(false)
    }
  }

  // While we’re checking existing session (first page load)
  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-gray-600">Checking session…</div>
      </main>
    )
  }

  // If session is present, the effect above will redirect shortly
  if (session) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="text-gray-600">Redirecting…</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
        <p className="text-sm text-gray-600 mb-6">
          You’ll get a magic link by email. After you click it, we’ll send you to&nbsp;
          <code className="bg-gray-100 px-1 py-0.5 rounded">{from}</code>.
        </p>

        <form onSubmit={sendLink} className="grid gap-4">
          <label className="text-sm text-gray-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="you@company.com"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-white ${busy ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {busy ? 'Sending…' : 'Send magic link'}
          </button>

          {sent && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              Magic link sent to <strong>{email}</strong>. Check your inbox and click the link.
            </div>
          )}

          {err && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {err}
            </div>
          )}
        </form>

        <div className="mt-6 text-xs text-gray-500">
          Tip: If you don’t see the email, check spam or try again.
        </div>
      </div>
    </main>
  )
}

