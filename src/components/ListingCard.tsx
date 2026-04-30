import { Link } from "@tanstack/react-router";
import { Heart, MapPin, Train, Bus, MessageCircle, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useFavorites, toggleFavorite } from "@/lib/store";
import { buildMessengerUrl } from "@/lib/config";
import { buildNaverMapSearchUrl } from "@/lib/maps";
import type { Listing } from "@/lib/types";
import { formatWon } from "@/lib/format";
import { PhotoGrid } from "./PhotoGrid";
import { OptionChips } from "./OptionChips";
import { useCityName } from "@/lib/useCityName";
import { cn } from "@/lib/utils";

export function ListingCard({ listing }: { listing: Listing }) {
  const { t, lang } = useI18n();
  const favs = useFavorites();
  const isFav = favs.has(listing.id);
  const displayTitle = (lang !== "mn" && listing.titleTranslations?.[lang]) || listing.title;
  const cityName = useCityName(listing.city);
  const messenger = buildMessengerUrl({
    listingId: listing.id,
    listingTitle: listing.title,
  });
  const mapsUrl = listing.address?.trim() ? buildNaverMapSearchUrl(listing.address.trim()) : "";

  return (
    <article className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-shadow border">
      <PhotoGrid
        photos={listing.photos}
        alt={displayTitle}
        overlay={
          <>
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
            <div className="absolute top-3 left-3 z-10 flex gap-1.5 pointer-events-none">
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
          </>
        }
      />

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground">{formatWon(listing.monthlyRent)}</span>
          <span className="text-xs text-muted-foreground">/ {t("card.monthly").toLowerCase()}</span>
        </div>
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
          {displayTitle}
        </h3>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          <span className="px-2 py-0.5 rounded-md bg-secondary">{t(`room.${listing.roomType}`)}</span>
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
            <span className="truncate">{listing.area ? `${cityName} · ${listing.area}` : cityName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Train className="h-3.5 w-3.5" />
              {listing.subwayMinutes > 0 ? `${listing.subwayMinutes} ${t("card.minWalk")}` : listing.subwayStation || "-"}
            </span>
            <span className="flex items-center gap-1">
              <Bus className="h-3.5 w-3.5" />
              {listing.busMinutes > 0 ? `${listing.busMinutes} ${t("card.minWalk")}` : listing.busStop || "-"}
            </span>
          </div>
        </div>

        {listing.options?.length > 0 && (
          <OptionChips options={listing.options.slice(0, 4)} size="sm" />
        )}

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
