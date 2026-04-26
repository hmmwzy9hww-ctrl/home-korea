import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, MapPin, Train, Bus, Calendar, Ruler, Building2, MessageCircle, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { useI18n } from "@/lib/i18n";
import { useListing, useFavorites, toggleFavorite } from "@/lib/store";
import { buildMessengerUrl } from "@/lib/config";
import { formatWon } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetailPage,
  notFoundComponent: () => (
    <AppShell showSearch={false}>
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground">Байр олдсонгүй.</p>
        <Link to="/listings" className="mt-4 inline-block text-primary text-sm font-medium">
          Бүх байр →
        </Link>
      </div>
    </AppShell>
  ),
});

function ListingDetailPage() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const listing = useListing(id);
  const favs = useFavorites();

  if (!listing) {
    return (
      <AppShell showSearch={false}>
        <div className="px-4 py-16 text-center">
          <p className="text-muted-foreground">Байр олдсонгүй.</p>
          <Link to="/listings" className="mt-4 inline-block text-primary text-sm font-medium">
            Бүх байр →
          </Link>
        </div>
      </AppShell>
    );
  }

  const isFav = favs.has(listing.id);
  const listingUrl =
    typeof window !== "undefined" ? window.location.href : `/listing/${listing.id}`;
  const messenger = buildMessengerUrl({
    listingTitle: listing.title,
    listingUrl,
    override: listing.messengerUrl,
  });

  return (
    <AppShell showSearch={false}>
      <div className="relative">
        <Link
          to="/listings"
          className="absolute top-3 left-3 z-10 grid place-items-center h-9 w-9 rounded-full bg-background/85 backdrop-blur shadow-card"
          aria-label={t("common.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(listing.id)}
          className="absolute top-3 right-3 z-10 grid place-items-center h-9 w-9 rounded-full bg-background/85 backdrop-blur shadow-card"
          aria-label={isFav ? t("card.fav.remove") : t("card.fav.add")}
        >
          <Heart className={cn("h-5 w-5", isFav ? "fill-destructive text-destructive" : "")} />
        </button>
        <PhotoCarousel photos={listing.photos} alt={listing.title} rounded={false} />
      </div>

      <div className="px-4 py-4 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {listing.featured && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                {t("card.featured")}
              </span>
            )}
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                listing.status === "available"
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {listing.status === "available" ? t("card.available") : t("card.unavailable")}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-tight">{listing.title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {t(`city.${listing.city}`)} · {listing.area}
          </p>
        </div>

        {/* Price block */}
        <div className="rounded-2xl border p-4 bg-card grid grid-cols-3 divide-x">
          <div className="px-2">
            <div className="text-[11px] text-muted-foreground">{t("card.monthly")}</div>
            <div className="font-bold text-base mt-0.5">{formatWon(listing.monthlyRent)}</div>
          </div>
          <div className="px-2">
            <div className="text-[11px] text-muted-foreground">{t("card.deposit")}</div>
            <div className="font-bold text-base mt-0.5">{formatWon(listing.deposit)}</div>
          </div>
          <div className="px-2">
            <div className="text-[11px] text-muted-foreground">{t("card.maint")}</div>
            <div className="font-bold text-base mt-0.5">{formatWon(listing.maintenanceFee)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {listing.maintenanceIncluded ? t("common.included") : t("common.notIncluded")}
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="rounded-2xl border bg-card divide-y">
          <InfoRow icon={Building2} label={t("card.roomType")} value={t(`room.${listing.roomType}`)} />
          <InfoRow icon={Ruler} label={t("card.size")} value={`${listing.size} m² · ${listing.floor} ${t("card.floor")}`} />
          <InfoRow icon={Train} label={t("card.subway")} value={`${listing.subwayStation} · ${listing.subwayMinutes} ${t("card.minWalk")}`} />
          <InfoRow icon={Bus} label={t("card.bus")} value={`${listing.busStop} · ${listing.busMinutes} ${t("card.minWalk")}`} />
          <InfoRow icon={Calendar} label={t("card.availableFrom")} value={listing.availableFrom} />
          <InfoRow icon={MapPin} label={t("card.address")} value={listing.address} />
        </div>

        {/* Options */}
        {listing.options.length > 0 && (
          <div>
            <h2 className="font-bold text-sm mb-2">{t("card.options")}</h2>
            <div className="flex flex-wrap gap-1.5">
              {listing.options.map((o) => (
                <span key={o} className="text-xs px-2.5 py-1 rounded-full bg-secondary">
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <h2 className="font-bold text-sm mb-2">{t("card.description")}</h2>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{listing.description}</p>
        </div>

        {/* Naver map */}
        {listing.naverMapUrl && (
          <a
            href={listing.naverMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl border bg-card hover:bg-secondary text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            {t("card.viewMap")}
          </a>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-16 inset-x-0 z-30 bg-background/95 backdrop-blur border-t">
        <div className="px-4 py-3 max-w-3xl mx-auto">
          <a
            href={messenger}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            {t("card.contact")}
          </a>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
