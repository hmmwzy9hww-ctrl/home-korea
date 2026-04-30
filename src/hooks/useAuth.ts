import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Auth hook that tracks the current Supabase session AND whether the
 * signed-in user has the `admin` role in `public.user_roles`.
 *
 * Pattern: subscribe to `onAuthStateChange` BEFORE calling `getSession()`,
 * and never `await` async work inside the listener (to avoid deadlocks).
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkRole = (uid: string | undefined) => {
      if (!uid) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      // Defer to next tick so we don't block the auth callback.
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle();
        if (cancelled) return;
        setIsAdmin(!error && !!data);
      }, 0);
    };

    // 1. Subscribe FIRST.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkRole(newSession?.user?.id);
    });

    // 2. THEN load existing session.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (cancelled) return;
      setSession(existing);
      checkRole(existing?.user?.id);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isAdmin,
    loading,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
