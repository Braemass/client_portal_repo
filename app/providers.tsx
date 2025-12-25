'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type AppContextType = {
  session: Session | null;
  loading: boolean;
  supabase: typeof supabase;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial session (typed + awaited)
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
    })();

    // Keep session in sync (typed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider value={{ session, loading, supabase }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <Providers>');
  return ctx;
}

export default Providers;
