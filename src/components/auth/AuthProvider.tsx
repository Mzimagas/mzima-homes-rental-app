"use client";
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowser } from '@/lib/supabase/client';

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: any; error: any }>;
};

const AuthContext = createContext<AuthCtx>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => ({ error: null }),
  signUp: async () => ({ data: null, error: 'Not implemented' })
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Only create supabase client after component mounts (client-side only)
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getSupabaseBrowser();
  }, [mounted]);


  // helper: sync client session to server cookies for SSR API routes
  const syncServerSession = async (event: string, sess: Session | null) => {
    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event, session: sess }),
      })
    } catch (e) {
      console.warn('AuthProvider: failed to sync server session', e)
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !supabase) return;

    let isMounted = true;

    // Get the actual session with tokens
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('⚠️ AuthProvider: Error getting session:', error);
        setSession(null);
      } else {
        setSession(session);
      }
      setLoading(false);
    });

    // Subscribe to changes and sync with server
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!isMounted) return;
      setSession(sess);
      setLoading(false);
      // sync server cookies so API routes can see the session
      await syncServerSession(event, sess)
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, mounted]);

  const signOut = async () => {
    try {
      if (!supabase) {
        return { error: 'Supabase client not available' };
      }

      // Use server-side sign out to properly clear cookies
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
        redirect: 'manual' // Don't follow redirects automatically
      });

      if (!response.ok && response.status !== 302) {
        console.warn('AuthProvider signOut error', { status: response.status });
        return { error: 'Unable to sign out at this time. Please try again.' };
      }

      console.log('AuthProvider signOut successful');

      // Small delay to ensure auth state is cleared before redirect
      setTimeout(() => {
        window.location.href = '/auth/login?msg=signout';
      }, 200);

      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error: error instanceof Error ? error.message : 'An unexpected error occurred during sign out. Please try again.' };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      if (!supabase) {
        return { data: null, error: 'Supabase client not available' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { data: null, error };
      }

      console.log('✅ User signed up successfully');
      return { data, error: null };
    } catch (error) {
      console.error('Sign up failed:', error);
      return { data: null, error };
    }
  };

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading: loading || !mounted,
    signOut,
    signUp
  }), [session, loading, mounted]);

  // Show loading state during SSR and initial mount
  if (!mounted) {
    return (
      <AuthContext.Provider value={{ session: null, user: null, loading: true, signOut, signUp }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
