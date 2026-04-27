import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { ArrowLeft, List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n";
import { useListings } from "@/lib/store";
import { formatWon } from "@/lib/format";
import type { City, Listing, RoomType, SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const LeafletMap = lazy(() =>
  import("@/components/LeafletMap").then((m) => ({ default: m.LeafletMap })),
);


interface ListingsSearch {
  q?: string;
  city?: City;
  roomType?: RoomType;
  minPrice?: number;
  maxPrice?: number;
  minDeposit?: number;
  maxDeposit?: number;
  subway?: string;
  availableNow?: boolean;
  maintIncluded?: boolean;
  sort?: SortKey;
}

export const Route = createFileRoute("/listings")({
  validateSearch: (s: Record<string, unknown>): ListingsSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
    city: (["seoul", "incheon", "gyeonggi", "busan", "other"].includes(String(s.city)) ? s.city : undefined) as City | undefined,
    roomType: (["oneRoom", "twoRoom", "threeRoom", "officetel", "studio", "share"].includes(String(s.roomType)) ? s.roomType : undefined) as RoomType | undefined,
    minPrice: typeof s.minPrice === "number" ? s.minPrice : undefined,
    maxPrice: typeof s.maxPrice === "number" ? s.maxPrice : undefined,
    minDeposit: typeof s.minDeposit === "number" ? s.minDeposit : undefined,
    maxDeposit: typeof s.maxDeposit === "number" ? s.maxDeposit : undefined,
    subway: typeof s.subway === "string" ? s.subway : undefined,
    availableNow: s.availableNow === true,
    maintIncluded: s.maintIncluded === true,
    sort: (["newest", "priceAsc", "priceDesc"].includes(String(s.sort)) ? s.sort : "newest") as SortKey,
  }),
  component: ListingsPage,
});

const cities: (City | "all")[] = ["all", "seoul", "incheon", "gyeonggi", "busan", "other"];
const roomTypes: (RoomType | "all")[] = ["all", "oneRoom", "twoRoom", "threeRoom", "officetel", "studio", "share"];

function ListingsPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const all = useListings();
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = all.slice();
    if (search.city) r = r.filter((l) => l.city === search.city);
    if (search.roomType) r = r.filter((l) => l.roomType === search.roomType);
    if (search.minPrice) r = r.filter((l) => l.monthlyRent >= search.minPrice!);
    if (search.maxPrice) r = r.filter((l) => l.monthlyRent <= search.maxPrice!);
    if (search.minDeposit) r = r.filter((l) => l.deposit >= search.minDeposit!);
    if (search.maxDeposit) r = r.filter((l) => l.deposit <= search.maxDeposit!);
    if (search.subway) {
      const s = search.subway.toLowerCase();
      r = r.filter((l) => l.subwayStation.toLowerCase().includes(s));
    }
    if (search.availableNow) r = r.filter((l) => l.status === "available");
    if (search.maintIncluded) r = r.filter((l) => l.maintenanceIncluded);
    if (search.q) {
      const q = search.q.toLowerCase();
      r = r.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.area.toLowerCase().includes(q) ||
          l.subwayStation.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    if (search.sort === "priceAsc") r.sort((a, b) => a.monthlyRent - b.monthlyRent);
    else if (search.sort === "priceDesc") r.sort((a, b) => b.monthlyRent - a.monthlyRent);
    else r.sort((a, b) => b.createdAt - a.createdAt);
    // Always push unavailable (rented) listings to the bottom regardless of sort.
    r.sort((a, b) => {
      const aA = a.status === "available" ? 0 : 1;
      const bA = b.status === "available" ? 0 : 1;
      return aA - bA;
    });
    return r;
  }, [all, search]);

  const update = (patch: Partial<ListingsSearch>) => {
    navigate({ to: "/listings", search: { ...search, ...patch } as never });
  };

  const activeFilterCount = [
    search.city,
    search.roomType,
    search.minPrice,
    search.maxPrice,
    search.subway,
    search.availableNow ? 1 : null,
    search.maintIncluded ? 1 : null,
  ].filter(Boolean).length;

  return (
    <AppShell showSearch={false}>
      {/* Sticky filter bar */}
      <div className="sticky top-[57px] z-20 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <Link
            to="/"
            aria-label={t("common.back")}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-bold text-sm flex-1 truncate">
            {search.city ? t(`city.${search.city}`) : t("listings.title")}
          </h1>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background text-xs font-medium hover:bg-secondary"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {t("filter.title")}
            {activeFilterCount > 0 && (
              <span className="grid place-items-center h-4 min-w-4 px-1 text-[10px] rounded-full bg-primary text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        {/* Quick chips */}
        <div className="flex items-center gap-1.5 px-4 pb-2.5 overflow-x-auto no-scrollbar">
          {cities.map((c) => {
            const active = (search.city ?? "all") === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => update({ city: c === "all" ? undefined : (c as City) })}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  active ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary",
                )}
              >
                {c === "all" ? t("filter.any") : t(`city.${c}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t("listings.count", { count: filtered.length })}
          </p>
          {/* List/map toggle */}
          <div className="inline-flex rounded-full border bg-card p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full",
                view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <List className="h-3.5 w-3.5" />
              {t("view.list")}
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full",
                view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              <MapIcon className="h-3.5 w-3.5" />
              {t("view.map")}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("listings.empty")}
          </div>
        ) : view === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <MapView
            listings={filtered}
            selectedId={selectedPin}
            onSelect={setSelectedPin}
          />
        )}
      </div>

      {/* Filter sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setFilterOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-background rounded-t-3xl max-h-[85vh] overflow-y-auto safe-bottom">
            <div className="sticky top-0 bg-background border-b px-5 py-3 flex items-center justify-between">
              <h2 className="font-bold">{t("filter.title")}</h2>
              <button onClick={() => setFilterOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-5">
              <FilterGroup label={t("filter.city")}>
                {cities.map((c) => (
                  <Chip
                    key={c}
                    active={(search.city ?? "all") === c}
                    onClick={() => update({ city: c === "all" ? undefined : (c as City) })}
                  >
                    {c === "all" ? t("filter.any") : t(`city.${c}`)}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup label={t("filter.roomType")}>
                {roomTypes.map((r) => (
                  <Chip
                    key={r}
                    active={(search.roomType ?? "all") === r}
                    onClick={() => update({ roomType: r === "all" ? undefined : (r as RoomType) })}
                  >
                    {r === "all" ? t("filter.any") : t(`room.${r}`)}
                  </Chip>
                ))}
              </FilterGroup>
              <FilterGroup label={t("filter.price") + " (₩)"}>
                <RangeInput
                  min={search.minPrice}
                  max={search.maxPrice}
                  onChange={(min, max) => update({ minPrice: min, maxPrice: max })}
                />
              </FilterGroup>
              <FilterGroup label={t("filter.deposit") + " (₩)"}>
                <RangeInput
                  min={search.minDeposit}
                  max={search.maxDeposit}
                  onChange={(min, max) => update({ minDeposit: min, maxDeposit: max })}
                />
              </FilterGroup>
              <FilterGroup label={t("filter.subway")}>
                <input
                  type="text"
                  value={search.subway || ""}
                  onChange={(e) => update({ subway: e.target.value || undefined })}
                  placeholder={t("filter.subway")}
                  className="w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </FilterGroup>
              <div className="space-y-2">
                <ToggleRow
                  label={t("filter.availableNow")}
                  checked={!!search.availableNow}
                  onChange={(v) => update({ availableNow: v || undefined })}
                />
                <ToggleRow
                  label={t("filter.maintIncluded")}
                  checked={!!search.maintIncluded}
                  onChange={(v) => update({ maintIncluded: v || undefined })}
                />
              </div>
              <FilterGroup label={t("filter.sort")}>
                {(["newest", "priceAsc", "priceDesc"] as SortKey[]).map((s) => (
                  <Chip key={s} active={(search.sort ?? "newest") === s} onClick={() => update({ sort: s })}>
                    {t(`sort.${s}`)}
                  </Chip>
                ))}
              </FilterGroup>
            </div>
            <div className="sticky bottom-0 bg-background border-t px-5 py-3 flex gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/listings", search: {} as never })}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-secondary"
              >
                {t("filter.reset")}
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                {t("filter.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{label}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        active ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function RangeInput({
  min,
  max,
  onChange,
}: {
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="number"
        value={min ?? ""}
        placeholder="Min"
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined, max)}
        className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background"
      />
      <span className="text-muted-foreground">—</span>
      <input
        type="number"
        value={max ?? ""}
        placeholder="Max"
        onChange={(e) => onChange(min, e.target.value ? Number(e.target.value) : undefined)}
        className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background"
      />
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 cursor-pointer">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}

function MapView({
  listings,
  selectedId,
  onSelect,
}: {
  listings: Listing[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const selected = listings.find((l) => l.id === selectedId) || listings[0];
  const focusQuery = selected
    ? getListingLocationText(selected) || t(`city.${selected.city}`)
    : "Korea";
  // Google Maps embed (no API key needed for /maps?q=&output=embed)
  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(focusQuery)}&z=14&output=embed`;
  const externalUrl = selected
    ? buildNaverMapSearchUrl(getListingLocationText(selected) || t(`city.${selected.city}`))
    : "";

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-2xl border bg-muted aspect-[4/3] sm:aspect-[16/9]">
        <iframe
          key={focusQuery}
          src={embedSrc}
          title="map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full"
        />
      </div>

      {externalUrl && (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("map.openExternal")}
        </a>
      )}

      <ul className="space-y-2">
        {listings.map((l) => {
          const active = selected?.id === l.id;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onSelect(l.id)}
                className={cn(
                  "w-full text-left flex items-start gap-3 rounded-2xl border p-3 transition-colors",
                  active ? "border-primary bg-primary/5" : "bg-card hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold truncate">{l.title}</span>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">
                      {formatWon(l.monthlyRent)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[t(`city.${l.city}`), l.area || l.address].filter(Boolean).join(" · ")}
                  </div>
                  {active && (
                    <Link
                      to="/listing/$id"
                      params={{ id: l.id }}
                      className="mt-2 inline-block text-xs font-medium text-primary"
                    >
                      {t("card.viewDetail")} →
                    </Link>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
