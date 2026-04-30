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
 * Auth hook that tracks the current session AND whether the
 * signed-in user is an admin via `public.user_roles` and, when present,
 * a legacy `role` field on `public.profiles`.
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
    let requestId = 0;

    const isRetryableRoleError = (error: unknown) => {
      if (!error || typeof error !== "object") return false;
      const code = "code" in error ? String(error.code ?? "") : "";
      const message = "message" in error ? String(error.message ?? "") : "";
      return (
        code === "PGRST001" ||
        code === "PGRST002" ||
        message.includes("schema cache") ||
        message.includes("Database client error") ||
        message.includes("Failed to fetch")
      );
    };

    const checkRole = (uid: string | undefined) => {
      const currentRequestId = ++requestId;

      if (!uid) {
        if (!cancelled && currentRequestId === requestId) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      // Defer to next tick so we don't block the auth callback.
      setTimeout(async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const [userRolesResult, profileResult] = await Promise.all([
            supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", uid)
              .eq("role", "admin")
              .maybeSingle(),
            (supabase.from("profiles") as any).select("*").eq("user_id", uid).maybeSingle(),
          ]);

          if (cancelled || currentRequestId !== requestId) return;

          const userRolesIsAdmin = !userRolesResult.error && !!userRolesResult.data;
          const profileIsAdmin =
            !profileResult.error && ((profileResult.data as { role?: string } | null)?.role === "admin");

          if (userRolesIsAdmin || profileIsAdmin) {
            setIsAdmin(true);
            setLoading(false);
            return;
          }

          const shouldRetry =
            isRetryableRoleError(userRolesResult.error) || isRetryableRoleError(profileResult.error);

          if (!shouldRetry) {
            setIsAdmin(false);
            setLoading(false);
            return;
          }

          if (attempt < 5) {
            await new Promise((resolve) => window.setTimeout(resolve, 300 * (attempt + 1)));
          }
        }

        if (!cancelled && currentRequestId === requestId) {
          setIsAdmin(false);
          setLoading(false);
        }
      }, 0);
    };

    // 1. Subscribe FIRST.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(true);
      checkRole(newSession?.user?.id);
    });

    // 2. THEN load existing session.
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      if (cancelled) return;
      setSession(existing);
      checkRole(existing?.user?.id);
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
