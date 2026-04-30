import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { ArrowLeft, List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ListingCard } from "@/components/ListingCard";
import { useI18n } from "@/lib/i18n";
import { cityName, roomTypeName, useCitiesData, useListings, useRoomTypesData } from "@/lib/store";
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
    city: typeof s.city === "string" && s.city ? (s.city as City) : undefined,
    roomType: typeof s.roomType === "string" && s.roomType ? (s.roomType as RoomType) : undefined,
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


function ListingsPage() {
  const { t, lang } = useI18n();
  const citiesData = useCitiesData();
  const roomTypesData = useRoomTypesData();
  const parentCities = useMemo(() => citiesData.filter((c) => !c.parent_id), [citiesData]);
  const districtsByParent = useMemo(() => {
    const m = new Map<string, typeof citiesData>();
    for (const c of citiesData) {
      if (c.parent_id) {
        const arr = m.get(c.parent_id) ?? [];
        arr.push(c);
        m.set(c.parent_id, arr);
      }
    }
    return m;
  }, [citiesData]);
  const search = Route.useSearch();
  const navigate = useNavigate();
  const all = useListings();
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let r = all.slice();
    if (search.city) {
      // include all districts under this city if it's a parent
      const childIds = (districtsByParent.get(search.city) ?? []).map((d) => d.id);
      const matchSet = new Set<string>([search.city, ...childIds]);
      r = r.filter((l) => matchSet.has(l.city));
    }
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
          <button
            type="button"
            onClick={() => update({ city: undefined })}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              !search.city ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary",
            )}
          >
            {t("filter.any")}
          </button>
          {parentCities.map((c) => {
            const active = search.city === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => update({ city: c.id as City })}
                className={cn(
                  "shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  active ? "bg-foreground text-background border-foreground" : "bg-background hover:bg-secondary",
                )}
              >
                {c.emoji ? `${c.emoji} ` : ""}{cityName(c, lang)}
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
            city={search.city}
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
                <Chip active={!search.city} onClick={() => update({ city: undefined })}>
                  {t("filter.any")}
                </Chip>
                {parentCities.map((c) => {
                  const districts = districtsByParent.get(c.id) ?? [];
                  const parentActive = search.city === c.id || districts.some((d) => d.id === search.city);
                  return (
                    <div key={c.id} className="w-full">
                      <Chip
                        active={parentActive}
                        onClick={() => update({ city: c.id as City })}
                      >
                        {c.emoji ? `${c.emoji} ` : ""}{cityName(c, lang)}
                      </Chip>
                      {parentActive && districts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5 ml-3">
                          {districts.map((d) => (
                            <Chip
                              key={d.id}
                              active={search.city === d.id}
                              onClick={() => update({ city: d.id as City })}
                            >
                              {cityName(d, lang)}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </FilterGroup>
              <FilterGroup label={t("filter.roomType")}>
                <Chip active={!search.roomType} onClick={() => update({ roomType: undefined })}>
                  {t("filter.any")}
                </Chip>
                {roomTypesData.map((r) => (
                  <Chip
                    key={r.id}
                    active={search.roomType === r.id}
                    onClick={() => update({ roomType: r.id as RoomType })}
                  >
                    {r.emoji ? `${r.emoji} ` : ""}{roomTypeName(r, lang)}
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
  city,
  selectedId,
  onSelect,
}: {
  listings: Listing[];
  city: City | undefined;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useI18n();
  const selected = listings.find((l) => l.id === selectedId) || null;

  return (
    <div className="relative">
      <Suspense
        fallback={
          <div className="h-[60vh] min-h-[360px] w-full grid place-items-center rounded-2xl border bg-muted text-sm text-muted-foreground">
            …
          </div>
        }
      >
        <LeafletMap
          listings={listings}
          city={city}
          selectedId={selectedId}
          onSelect={(id) => onSelect(id)}
        />
      </Suspense>

      {selected && (
        <div className="absolute left-3 right-3 bottom-3 z-[400] rounded-2xl border bg-background shadow-lg overflow-hidden">
          <button
            type="button"
            aria-label="Close"
            onClick={() => onSelect(null)}
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
