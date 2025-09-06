// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const runtime = 'nodejs'         // ensure Node runtime (supabase-js expects Node APIs)
export const dynamic = 'force-dynamic'  // don’t cache, this sets auth cookies

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/profile'

  // Decide where we want to land *before* we create the response we’ll mutate
  const dest = code ? next : '/login'
  const res = NextResponse.redirect(new URL(dest, req.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    },
  )

  if (code) {
    // Exchange the code for a session (IMPORTANT: string param, not object)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const errorRes = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
      )
      return errorRes
    }
  }

  // Either success with a session (→ next), or no code (→ /login)
  return res
}

// Optional: lets the client ping here after email+password sign-in/sign-out to sync cookies server-side
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, value, options)
        },
        remove(name: string, options?: Parameters<typeof res.cookies.set>[2]) {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    },
  )

  // Touch the session so @supabase/ssr can set/clear cookies on this response
  await supabase.auth.getSession()
  return res
}

