import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Heart, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n";
import {
  clearNotifications,
  markAllNotificationsRead,
  useFavorites,
  useListings,
  useNotifications,
} from "@/lib/store";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const all = useListings();
  const favs = useFavorites();
  const items = all.filter((l) => favs.has(l.id));
  const notifs = useNotifications();
  const unread = notifs.filter((n) => !n.read).length;

  return (
    <AppShell showSearch={false}>
      <div className="px-4 py-4 space-y-6">
        {/* Notifications */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold inline-flex items-center gap-2">
              <Bell className="h-4 w-4" />
              {t("notif.title")}
              {unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </h2>
            {notifs.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("notif.markAll")}
                </button>
                <button
                  type="button"
                  onClick={clearNotifications}
                  aria-label={t("notif.clear")}
                  className="text-xs text-destructive inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
          {notifs.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("notif.empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              {notifs.slice(0, 8).map((n) => {
                const inner = (
                  <div
                    className={
                      "rounded-xl border p-3 text-sm " +
                      (n.read ? "bg-card" : "bg-primary/5 border-primary/30")
                    }
                  >
                    <div className="font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {n.message}
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.listingId ? (
                      <Link
                        to="/listing/$id"
                        params={{ id: n.listingId }}
                        className="block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Favorites */}
        <section>
          <h1 className="text-xl font-bold mb-4">{t("fav.title")}</h1>
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-4">
                <Heart className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {t("fav.empty")}
              </p>
              <Link
                to="/listings"
                className="mt-5 inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
              >
                {t("home.cta.browse")}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
