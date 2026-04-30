import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Train, Bus, MessageCircle, ExternalLink, Wallet, Footprints } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { lookupCityName, lookupRoomTypeName, useFavorites, useReferenceData, toggleFavorite } from "@/lib/store";
import { buildMessengerUrl } from "@/lib/config";
import { buildNaverMapSearchUrl } from "@/lib/maps";
import type { Listing } from "@/lib/types";
import { formatWon } from "@/lib/format";
import { listingTitle, listingArea } from "@/lib/listingI18n";
import { useAutoTranslatedTitle } from "@/lib/useAutoTranslate";
import { cn } from "@/lib/utils";

const RENT_LABEL: Record<string, string> = {
  mn: "1 сарын түрээс",
  ko: "1개월 월세",
  en: "1-month rent",
  ru: "Аренда за 1 месяц",
  zh: "1个月租金",
  vi: "Thuê 1 tháng",
};

const PAYMENT_LABEL: Record<string, { mn: string; ko: string; en: string; ru: string; zh: string; vi: string }> = {
  monthly: {
    mn: "Сар бүр",
    ko: "매월 납부",
    en: "Monthly",
    ru: "Ежемесячно",
    zh: "每月支付",
    vi: "Hàng tháng",
  },
  quarterly: {
    mn: "3 сараар бөөн",
    ko: "3개월 선납",
    en: "Every 3 months",
    ru: "Раз в 3 месяца",
    zh: "3个月一次",
    vi: "3 tháng một lần",
  },
};

export function ListingCard({ listing }: { listing: Listing }) {
  const { t, lang } = useI18n();
  useReferenceData(); // ensures cache loads + re-renders when ready
  const favs = useFavorites();
  const isFav = favs.has(listing.id);
  const titleFallback = listingTitle(listing, lang);
  const { text: title } = useAutoTranslatedTitle({
    listingId: listing.id,
    targetLang: lang,
    title: listing.title,
    existing: listing.titleTranslations as Record<string, string | undefined> | undefined,
    descriptionSource: listing.description,
    descriptionExisting: listing.descriptionTranslations as Record<string, string | undefined> | undefined,
  });
  const _ = titleFallback; void _;
  const area = listingArea(listing, lang);
  const messenger = buildMessengerUrl({
    listingId: listing.id,
    listingTitle: title,
  });
  const mapsUrl = listing.address?.trim() ? buildNaverMapSearchUrl(listing.address.trim()) : "";
  const paymentKey = listing.paymentType || "monthly";
  const paymentLabel = PAYMENT_LABEL[paymentKey]?.[lang as "mn"] ?? paymentKey;
  const rentLabel = RENT_LABEL[lang] ?? RENT_LABEL.mn;

  return (
    <article className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow border">
      <Link to="/listing/$id" params={{ id: listing.id }} className="block relative">
        <CardPhotoGrid photos={listing.photos || []} alt={title} />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          aria-label={isFav ? t("card.fav.remove") : t("card.fav.add")}
          className="absolute top-3 right-3 z-10 grid place-items-center h-9 w-9 rounded-full bg-background/85 backdrop-blur shadow-card hover:bg-background"
        >
          <Heart className={cn("h-5 w-5", isFav ? "fill-destructive text-destructive" : "text-foreground")} />
        </button>
        <div className="absolute top-3 left-3 z-10 flex gap-1.5">
          {listing.featured && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary text-primary-foreground">
              {t("card.featured")}
            </span>
          )}
          {listing.status === "unavailable" && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-foreground/80 text-background">
              {t("card.unavailable")}
            </span>
          )}
        </div>
      </Link>

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-bold text-foreground">{formatWon(listing.monthlyRent)}</span>
          <span className="text-xs text-muted-foreground">/ {rentLabel}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            <Wallet className="h-3 w-3" />
            {paymentLabel}
          </span>
        </div>
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
          {title}
        </h3>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="px-2 py-0.5 rounded-md bg-secondary">{lookupRoomTypeName(listing.roomType, lang) || t(`room.${listing.roomType}`)}</span>
          <span className="px-2 py-0.5 rounded-md bg-secondary">
            {t("card.deposit")} {formatWon(listing.deposit)}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-secondary">
            {t("card.maint")} {formatWon(listing.maintenanceFee)}
          </span>
        </div>

        <div className="text-[12px] text-muted-foreground space-y-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{(() => { const cn2 = lookupCityName(listing.city, lang) || t(`city.${listing.city}`); return area ? `${cn2} · ${area}` : cn2; })()}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Train className="h-3.5 w-3.5" />
              {listing.subwayStation || "-"}
            </span>
            {(() => {
              // To metro: walking if subwayMinutes > 0, else by bus if busMinutes > 0
              if (listing.subwayMinutes > 0) {
                return (
                  <span className="flex items-center gap-1">
                    <Footprints className="h-3.5 w-3.5" />
                    {listing.subwayMinutes} {t("card.minWalk")} {t("card.toMetro")}
                  </span>
                );
              }
              if (listing.busMinutes > 0) {
                return (
                  <span className="flex items-center gap-1">
                    <Bus className="h-3.5 w-3.5" />
                    {listing.busMinutes} {t("card.minBus")} {t("card.toMetro")}
                  </span>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Link
            to="/listing/$id"
            params={{ id: listing.id }}
            className="flex-1 text-center text-xs font-medium py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            {t("card.viewDetail")}
          </Link>
          <a
            href={messenger}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {t("card.contact")}
          </a>
        </div>

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border bg-card hover:bg-secondary transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t("card.viewMap")}
          </a>
        )}
      </div>
    </article>
  );
}

/**
 * Facebook-style mini grid for listing cards.
 * 1 photo: full cover. 2: side-by-side. 3: 1 large + 2 small.
 * 4+: 1 large + up to 4 small (2x2). Last tile shows +N overlay if more remain.
 * Compact aspect ratio so cards stay scannable in a list/grid.
 */
function CardPhotoGrid({ photos, alt }: { photos: string[]; alt: string }) {
  const safe = (photos || []).filter(Boolean);
  if (safe.length === 0) {
    return (
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
        <img
          src="https://placehold.co/800x600?text=No+photo"
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  if (safe.length === 1) {
    return (
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={safe[0]}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
    );
  }
  if (safe.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 aspect-[4/3] w-full bg-background">
        {safe.map((src, i) => (
          <div key={i} className="relative overflow-hidden bg-muted">
            <img src={src} alt={`${alt} ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    );
  }
  // 3+ photos: FB-style 1 large + side column
  const display = safe.slice(0, 5);
  const remaining = Math.max(0, safe.length - display.length);
  const sideCount = display.length - 1; // 2..4
  return (
    <div className="grid grid-cols-2 gap-0.5 aspect-[4/3] w-full bg-background">
      <div className="relative overflow-hidden bg-muted">
        <img src={display[0]} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
      </div>
      <div
        className={cn(
          "grid gap-0.5",
          sideCount >= 3 ? "grid-cols-2" : "grid-cols-1",
          sideCount >= 2 ? "grid-rows-2" : "grid-rows-1",
        )}
      >
        {display.slice(1).map((src, i) => {
          const isLast = i === sideCount - 1;
          const overlay = isLast && remaining > 0;
          return (
            <div key={i} className="relative overflow-hidden bg-muted">
              <img src={src} alt={`${alt} ${i + 2}`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
              {overlay && (
                <span className="absolute inset-0 grid place-items-center bg-foreground/55 text-background text-base font-bold">
                  +{remaining}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
