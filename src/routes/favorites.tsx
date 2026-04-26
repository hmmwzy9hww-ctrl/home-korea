import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n";
import { useListings, useFavorites } from "@/lib/store";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useI18n();
  const all = useListings();
  const favs = useFavorites();
  const items = all.filter((l) => favs.has(l.id));

  return (
    <AppShell showSearch={false}>
      <div className="px-4 py-4">
        <h1 className="text-xl font-bold mb-4">{t("fav.title")}</h1>
        {items.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-secondary grid place-items-center mb-4">
              <Heart className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{t("fav.empty")}</p>
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
      </div>
    </AppShell>
  );
}
