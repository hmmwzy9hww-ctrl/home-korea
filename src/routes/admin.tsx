import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Plus, Pencil, Trash2, Star, StarOff, LogOut, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import {
  useAdmin,
  loginAdmin,
  logoutAdmin,
  useListings,
  deleteListing,
  updateListing,
} from "@/lib/store";
import { ADMIN_PASSWORD } from "@/lib/config";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const isAdmin = useAdmin();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  const all = useListings();
  const navigate = useNavigate();

  if (!isAdmin) {
    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      const ok = loginAdmin(pw, ADMIN_PASSWORD);
      if (!ok) setErr(t("admin.login.wrong"));
    };
    return (
      <AppShell showSearch={false}>
        <div className="px-4 py-10 max-w-sm mx-auto">
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center mb-4">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-center">{t("admin.login.title")}</h1>
            <p className="mt-1 text-xs text-muted-foreground text-center">{t("admin.login.sub")}</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                placeholder={t("admin.login.password")}
                className="w-full px-4 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              {err && <p className="text-xs text-destructive">{err}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                {t("admin.login.submit")}
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showSearch={false}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">{t("admin.title")}</h1>
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              toast.success("Гарлаа");
            }}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("admin.logout")}
          </button>
        </div>

        <Link
          to="/admin/edit/$id"
          params={{ id: "new" }}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 mb-4"
        >
          <Plus className="h-4 w-4" />
          {t("admin.add")}
        </Link>

        <ul className="space-y-2.5">
          {all.map((l) => (
            <li key={l.id} className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex gap-3 p-3">
                <img
                  src={l.photos[0] || "https://placehold.co/200x200?text=No"}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover shrink-0 bg-muted"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {l.featured && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        l.status === "available"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {l.status === "available" ? t("card.available") : t("card.unavailable")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-1">{l.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {t(`city.${l.city}`)} · {l.area}
                  </p>
                  <p className="text-xs font-bold mt-1">{formatWon(l.monthlyRent)}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 border-t divide-x">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/admin/edit/$id", params: { id: l.id } })}
                  className="py-2.5 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateListing(l.id, {
                      status: l.status === "available" ? "unavailable" : "available",
                    });
                    toast.success(t("form.saved"));
                  }}
                  className="py-2.5 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
                >
                  {l.status === "available" ? (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{t("admin.markUnavailable")}</span>
                      <span className="xs:hidden">{t("card.unavailable")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{t("admin.markAvailable")}</span>
                      <span className="xs:hidden">{t("card.available")}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateListing(l.id, { featured: !l.featured });
                    toast.success(t("form.saved"));
                  }}
                  className="py-2.5 text-xs font-medium hover:bg-secondary inline-flex items-center justify-center gap-1"
                >
                  {l.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                  {t("card.featured")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(t("admin.delete.confirm"))) {
                      deleteListing(l.id);
                      toast.success(t("form.deleted"));
                    }
                  }}
                  className="py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 inline-flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("admin.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
