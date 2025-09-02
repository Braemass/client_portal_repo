'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function NewClientPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState<string>('')
  const [loading, setLoading] = useState(false)

  async function createClient(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')

    // Basic validation
    const emailLc = email.trim().toLowerCase()
    const nameTrim = name.trim()

    if (!emailLc) {
      setMsg('❌ Please enter an email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLc)) {
      setMsg('❌ Please enter a valid email address.')
      return
    }
    if (!nameTrim) {
      setMsg('❌ Please enter a name.')
      return
    }

    try {
      setLoading(true)

      // Upsert ensures we don't hit "duplicate key" on unique email
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { email: emailLc, name: nameTrim, role: 'client' },
          { onConflict: 'email' } // relies on a unique constraint/index on email (or lower(email))
        )

      if (error) {
        setMsg('❌ ' + error.message)
      } else {
        setMsg('✅ Saved (existing client updated if already present)')
        // optional: clear the form
        // setEmail(''); setName('')
      }
    } catch (err: any) {
      setMsg('❌ ' + (err?.message || 'Unexpected error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">New Client</h1>
          <Link href="/admin" className="rounded-lg border px-3 py-2 hover:bg-gray-50">
            Admin Home
          </Link>
        </header>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <form className="grid gap-4" onSubmit={createClient}>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Client Email</label>
              <input
                type="email"
                className="w-full rounded-lg border px-3 py-2"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                We store emails in lowercase to avoid duplicates (e.g., JOE@ → joe@).
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Client Name</label>
              <input
                type="text"
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Client Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Role</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-gray-50"
                value="client"
                readOnly
              />
              <p className="mt-1 text-xs text-gray-500">Role is fixed to <code>client</code> for new client accounts.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-white ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? 'Saving…' : 'Save Client'}
              </button>
              <Link
                href="/admin/projects/new"
                className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                title="Create a project for this client next"
              >
                Create Project →
              </Link>
            </div>

            {msg && <div className="text-sm mt-1">{msg}</div>}
          </form>
        </div>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Tips</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-gray-600 space-y-1">
            <li>
              If you still see “duplicate email” errors, ensure you have a unique index on email. Recommended:
              <pre className="mt-2 rounded bg-gray-100 p-2 overflow-auto">
{`-- Case-insensitive uniqueness (recommended)
-- (run in Supabase SQL editor once)
-- alter table profiles drop constraint if exists profiles_email_key;
-- alter table profiles drop constraint if exists profiles_email_unique;
create unique index if not exists profiles_email_unique_lower on profiles (lower(email));`}
              </pre>
            </li>
            <li>
              Row-Level Security must allow admins to <em>insert</em> into <code>profiles</code>. If you switched to an
              <code>admins</code> table for RLS checks, be sure the policy is:
              <pre className="mt-2 rounded bg-gray-100 p-2 overflow-auto">
{`create policy "profiles insert admin only"
on profiles
for insert
to authenticated
with check (exists (select 1 from admins a where lower(a.email)=lower(auth.email())));`}
              </pre>
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}

