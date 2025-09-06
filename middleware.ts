// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic' // always run; we’re reading auth on each request

function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const envList =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) ?? []
  return envList.includes(email.toLowerCase())
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Response we may mutate cookies on and return
  const res = NextResponse.next()

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
    }
  )

  const { data } = await supabase.auth.getSession()
  const session = data.session
  const email = session?.user?.email ?? null
  const isAuthed = !!session

  const wantsAdmin = pathname.startsWith('/admin')
  const isProtected =
    wantsAdmin || pathname.startsWith('/profile') || pathname.startsWith('/projects')
  const isRoot = pathname === '/'
  const isLogin = pathname === '/login'
  // allow reset-password & auth callback without checks

  // Root: send to login, or to profile/admin if already signed in
  if (isRoot) {
    const url = req.nextUrl.clone()
    if (!isAuthed) {
      url.pathname = '/login'
    } else {
      url.pathname = isAdminEmail(email) ? '/admin' : '/profile'
    }
    return NextResponse.redirect(url)
  }

  // Gate protected routes
  if (isProtected) {
    if (!isAuthed) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`
      return NextResponse.redirect(url)
    }
    if (wantsAdmin && !isAdminEmail(email)) {
      const url = req.nextUrl.clone()
      url.pathname = '/profile'
      return NextResponse.redirect(url)
    }
    return res
  }

  // Signed-in users hitting /login → bounce to their area
  if (isLogin && isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = isAdminEmail(email) ? '/admin' : '/profile'
    return NextResponse.redirect(url)
  }

  // Everything else passes through
  return res
}

export const config = {
  matcher: [
    '/',                // root
    '/login',           // login page
    '/reset-password',  // reset password page
    '/profile',         // profile
    '/projects/:path*', // projects
    '/admin/:path*',    // admin area
  ],
}

