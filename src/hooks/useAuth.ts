// Auth hook: tracks session + admin role from `user_roles` table.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
}

let cached: AuthState = { session: null, loading: true, isAdmin: false };
const listeners = new Set<() => void>();
let initialized = false;

function emit() {
  listeners.forEach((l) => l());
}

async function checkAdmin(uid: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "admin")
    .maybeSingle();
  if (error) {
    console.error("[auth] role check failed", error);
    return false;
  }
  return !!data;
}

async function applySession(session: Session | null) {
  if (!session) {
    cached = { session: null, loading: false, isAdmin: false };
    emit();
    return;
  }
  cached = { session, loading: true, isAdmin: false };
  emit();
  const isAdmin = await checkAdmin(session.user.id);
  cached = { session, loading: false, isAdmin };
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // IMPORTANT: register listener BEFORE getSession to avoid races.
  supabase.auth.onAuthStateChange((_event, session) => {
    void applySession(session);
  });
  void supabase.auth.getSession().then(({ data }) => {
    void applySession(data.session ?? null);
  });
}

export function useAuth(): AuthState {
  const [, force] = useState(0);
  useEffect(() => {
    ensureInit();
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);
  ensureInit();
  return cached;
}

export async function signOut() {
  await supabase.auth.signOut();
}
