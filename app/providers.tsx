'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabaseClient'

type SupabaseCtx = {
  supabase: SupabaseClient
  session: Session | null
  loading: boolean
}

const Ctx = createContext<SupabaseCtx | undefined>(undefined)

export default function Providers({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })

    // subscribe to changes
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const value = useMemo(() => ({ supabase, session, loading }), [supabase, session, loading])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// Hooks you can use in client components
export function useSupabase() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSupabase must be used inside <Providers>')
  return ctx.supabase
}

export function useSession() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSession must be used inside <Providers>')
  return { session: ctx.session, loading: ctx.loading }
}

