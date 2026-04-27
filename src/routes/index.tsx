import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Train, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n";
import { useListings, useSiteSettings } from "@/lib/store";
import type { City } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// Sort: available first (newest first), unavailable last (newest first).
function sortAvailableFirst<T extends { status: string; createdAt: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aA = a.status === "available" ? 0 : 1;
    const bA = b.status === "available" ? 0 : 1;
    if (aA !== bA) return aA - bA;
    return b.createdAt - a.createdAt;
  });
}

function HomePage() {
  const { t } = useI18n();
  const all = useListings();
  const settings = useSiteSettings();

  const featured = all.filter((l) => l.featured && l.status === "available").slice(0, 4);
  const latest = sortAvailableFirst(all).slice(0, 4);

  const cities: { code: City; emoji: string }[] = [
    { code: "seoul", emoji: "🏙️" },
    { code: "incheon", emoji: "✈️" },
    { code: "gyeonggi", emoji: "🌆" },
    { code: "busan", emoji: "🌊" },
    { code: "other", emoji: "📍" },
  ];

  const countByCity = (c: City) => all.filter((l) => l.city === c).length;
  const countUnder = (price: number) => all.filter((l) => l.monthlyRent <= price).length;
  const countNearMetro = all.filter((l) => l.subwayMinutes <= 5).length;

  return (
    <AppShell>
      {/* Hero cover image (admin-editable) */}
      {settings.coverImageUrl && (
        <section className="px-4 pt-3">
          <div className="relative w-full overflow-hidden rounded-3xl border aspect-[16/9] sm:aspect-[21/9] bg-muted">
            <img
              src={settings.coverImageUrl}
              alt={t("brand")}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-foreground/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
              <h1 className="text-xl sm:text-3xl font-extrabold leading-tight whitespace-pre-line drop-shadow">
                {t("home.hero.title")}
              </h1>
              <p className="mt-1 text-xs sm:text-sm opacity-90 max-w-md drop-shadow">
                {t("home.hero.sub")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 pt-4 pb-2">
        <Link
          to="/listings"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
        >
          {t("home.cta.browse")}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Cities */}
      <section className="px-4 pt-4 pb-6">
        <h2 className="text-base font-bold mb-3">{t("home.section.cities")}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {cities.map((c) => (
            <Link
              key={c.code}
              to="/listings"
              search={{ city: c.code } as never}
              className="flex flex-col items-center gap-1 py-3 rounded-2xl border bg-card hover:bg-secondary transition-colors"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs font-medium">{t(`city.${c.code}`)}</span>
              <span className="text-[10px] text-muted-foreground">{countByCity(c.code)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* City stats — live counts */}
      <section className="px-4 pb-6">
        <h2 className="text-base font-bold mb-3">{t("home.section.cityStats")}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cities.map((c) => {
            const count = countByCity(c.code);
            return (
              <Link
                key={c.code}
                to="/listings"
                search={{ city: c.code } as never}
                className="flex items-center justify-between p-3 rounded-2xl border bg-gradient-to-br from-primary/10 to-accent hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl shrink-0">{c.emoji}</span>
                  <span className="text-sm font-semibold truncate">{t(`city.${c.code}`)}</span>
                </div>
                <span className="text-sm font-bold text-primary whitespace-nowrap">
                  {t("home.cityStats.unit", { count })}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick summaries */}
      <section className="px-4 pb-6">
        <h2 className="text-base font-bold mb-3">{t("home.section.quick")}</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/listings"
            search={{ city: "seoul" } as never}
            className="p-3 rounded-2xl border bg-card hover:shadow-card-hover transition-shadow"
          >
            <div className="text-xs text-muted-foreground">{t("city.seoul")}</div>
            <div className="text-base font-bold mt-0.5">
              {t("summary.inCity", { city: t("city.seoul"), count: countByCity("seoul") })}
            </div>
          </Link>
          <Link
            to="/listings"
            search={{ city: "incheon" } as never}
            className="p-3 rounded-2xl border bg-card hover:shadow-card-hover transition-shadow"
          >
            <div className="text-xs text-muted-foreground">{t("city.incheon")}</div>
            <div className="text-base font-bold mt-0.5">
              {t("summary.inCity", { city: t("city.incheon"), count: countByCity("incheon") })}
            </div>
          </Link>
          <Link
            to="/listings"
            search={{ maxPrice: 500000 } as never}
            className="p-3 rounded-2xl border bg-card hover:shadow-card-hover transition-shadow"
          >
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" /> 50만 ₩
            </div>
            <div className="text-base font-bold mt-0.5">
              {t("summary.under", { price: "50만", count: countUnder(500000) })}
            </div>
          </Link>
          <Link
            to="/listings"
            search={{} as never}
            className="p-3 rounded-2xl border bg-card hover:shadow-card-hover transition-shadow"
          >
            <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Train className="h-3 w-3" /> {t("card.subway")}
            </div>
            <div className="text-base font-bold mt-0.5">
              {t("summary.nearMetro", { count: countNearMetro })}
            </div>
          </Link>
        </div>
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold">{t("home.section.featured")}</h2>
            <Link to="/listings" className="text-xs text-primary font-medium">
              {t("home.cta.browse")} →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {/* Latest */}
      <section className="px-4 pb-6">
        <h2 className="text-base font-bold mb-3">{t("home.section.latest")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {latest.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
