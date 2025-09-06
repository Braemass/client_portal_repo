// LoginClient.tsx (client component)
'use client'

import { AUTH_CALLBACK } from '@/lib/site';
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginClient() {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setMsg(null)
    setErr(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
		redirectTo: `${AUTH_CALLBACK}?next=/reset-password`,
    })

    if (error) setErr(error.message)
    else setMsg('Check your inbox for a password reset link.')
    setSending(false)
  }

  return (
    <form onSubmit={onForgotPassword} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="input"
        required
      />
      <button type="submit" disabled={sending} className="btn btn-primary">
        {sending ? 'Sending…' : 'Send reset link'}
      </button>

      {msg && <p className="text-green-600 text-sm">{msg}</p>}
      {err && <p className="text-red-600 text-sm">{err}</p>}
    </form>
  )
}

