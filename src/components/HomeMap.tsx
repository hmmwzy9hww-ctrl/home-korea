import { Suspense, lazy, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import type { Listing } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { formatWon } from "@/lib/format";

const LeafletMap = lazy(() =>
  import("@/components/LeafletMap").then((m) => ({ default: m.LeafletMap })),
);

interface Props {
  listings: Listing[];
}

/**
 * Compact interactive map for the homepage.
 * - ~300px tall on mobile
 * - Centered on South Korea (zoom 7) so Seoul / Incheon / Gyeonggi / Busan are visible
 * - Pins show monthly rent, cluster when zoomed out
 * - Tap a pin → small preview card with photo, title, price, and detail CTA
 */
export function HomeMap({ listings }: Props) {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = listings.find((l) => l.id === selectedId) || null;

  const mapClass =
    "h-[300px] sm:h-[380px] w-full overflow-hidden rounded-2xl border bg-muted z-0";

  return (
    <div className="relative">
      <Suspense
        fallback={
          <div className={mapClass + " grid place-items-center text-sm text-muted-foreground"}>
            …
          </div>
        }
      >
        <LeafletMap
          listings={listings}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          className={mapClass}
          initialZoom={7}
        />
      </Suspense>

      {selected && (
        <div className="absolute left-3 right-3 bottom-3 z-[400] rounded-2xl border bg-background shadow-lg overflow-hidden">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setSelectedId(null)}
            className="absolute right-2 top-2 z-10 grid place-items-center h-7 w-7 rounded-full bg-background/90 border"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-3 p-3">
            {selected.photos[0] && (
              <img
                src={selected.photos[0]}
                alt={selected.title}
                className="h-20 w-20 rounded-lg object-cover bg-muted shrink-0"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate pr-6">{selected.title}</div>
              <div className="text-xs text-muted-foreground truncate">
                {[t(`city.${selected.city}`), t(`room.${selected.roomType}`)]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="mt-1 text-base font-bold text-primary">
                {formatWon(selected.monthlyRent)}
              </div>
              <Link
                to="/listing/$id"
                params={{ id: selected.id }}
                className="mt-2 inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold"
              >
                {t("card.viewDetail")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
