import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Lock, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only redirect once the admin role check has completed.
  useEffect(() => {
    if (!loading && session && isAdmin) {
      navigate({ to: "/admin", replace: true });
    }
  }, [loading, session, isAdmin, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Имэйл болон нууц үгээ оруулна уу");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Тавтай морил!");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });
        if (error) throw error;
        toast.success("Бүртгэл үүслээ. Имэйлээ шалгана уу.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Алдаа гарлаа";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell showSearch={false}>
      <div className="mx-auto max-w-sm px-4 py-10">
        <div className="rounded-3xl border bg-card p-6 shadow-card">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-center text-lg font-bold">
            {mode === "signin" ? "Админ нэвтрэх" : "Шинэ админ бүртгэл"}
          </h1>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            Зөвхөн админ эрхтэй хэрэглэгч нэвтэрнэ
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Имэйл"
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
            <input
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Нууц үг"
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {mode === "signin" ? (
                <>
                  <LogIn className="h-4 w-4" /> Нэвтрэх
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Бүртгүүлэх
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin"
              ? "Бүртгэл байхгүй юу? Бүртгүүлэх"
              : "Бүртгэлтэй юу? Нэвтрэх"}
          </button>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
              ← Нүүр хуудас
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
