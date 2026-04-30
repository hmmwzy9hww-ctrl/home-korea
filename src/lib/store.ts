// Listings store backed by Lovable Cloud (Supabase) with realtime sync.
import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sampleListings } from "./sampleData";
import type { City, Listing, ListingStatus, RoomType } from "./types";

let memoryStore: Listing[] = [];
let initialized = false;
let loaded = false;
const listeners = new Set<() => void>();

// Map a Supabase row (snake_case) to our Listing type (camelCase).
function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    roomType: (row.room_type as string) ?? "oneRoom",
    city: (row.city as string) ?? "other",
    area: String(row.area ?? ""),
    address: String(row.address ?? ""),
    monthlyRent: Number(row.monthly_rent ?? 0),
    deposit: Number(row.deposit ?? 0),
    maintenanceFee: Number(row.maintenance_fee ?? 0),
    maintenanceIncluded: Boolean(row.maintenance_included),
    floor: String(row.floor ?? ""),
    size: Number(row.size ?? 0),
    subwayStation: String(row.subway_station ?? ""),
    subwayMinutes: Number(row.subway_minutes ?? 0),
    busStop: String(row.bus_stop ?? ""),
    busMinutes: Number(row.bus_minutes ?? 0),
    availableFrom: String(row.available_from ?? ""),
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    description: String(row.description ?? ""),
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : [],
    naverMapUrl: row.naver_map_url ? String(row.naver_map_url) : undefined,
    messengerUrl: row.messenger_url ? String(row.messenger_url) : undefined,
    status: (row.status as ListingStatus) ?? "available",
    featured: Boolean(row.featured),
    createdAt: Number(row.created_at ?? Date.now()),
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    paymentType: row.payment_type ? String(row.payment_type) : "monthly",
    titleTranslations: (row.title_translations as Record<string, string>) ?? {},
    descriptionTranslations:
      (row.description_translations as Record<string, string>) ?? {},
    addressTranslations:
      (row.address_translations as Record<string, string>) ?? {},
    areaTranslations: (row.area_translations as Record<string, string>) ?? {},
    optionsTranslations:
      (row.options_translations as Record<string, string[]>) ?? {},
  };
}

function listingToRow(l: Partial<Listing>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (l.id !== undefined) row.id = l.id;
  if (l.title !== undefined) row.title = l.title;
  if (l.roomType !== undefined) row.room_type = l.roomType;
  if (l.city !== undefined) row.city = l.city;
  if (l.area !== undefined) row.area = l.area;
  if (l.address !== undefined) row.address = l.address;
  if (l.monthlyRent !== undefined) row.monthly_rent = l.monthlyRent;
  if (l.deposit !== undefined) row.deposit = l.deposit;
  if (l.maintenanceFee !== undefined) row.maintenance_fee = l.maintenanceFee;
  if (l.maintenanceIncluded !== undefined) row.maintenance_included = l.maintenanceIncluded;
  if (l.floor !== undefined) row.floor = l.floor;
  if (l.size !== undefined) row.size = l.size;
  if (l.subwayStation !== undefined) row.subway_station = l.subwayStation;
  if (l.subwayMinutes !== undefined) row.subway_minutes = l.subwayMinutes;
  if (l.busStop !== undefined) row.bus_stop = l.busStop;
  if (l.busMinutes !== undefined) row.bus_minutes = l.busMinutes;
  if (l.availableFrom !== undefined) row.available_from = l.availableFrom;
  if (l.options !== undefined) row.options = l.options;
  if (l.description !== undefined) row.description = l.description;
  if (l.photos !== undefined) row.photos = l.photos;
  if (l.naverMapUrl !== undefined) row.naver_map_url = l.naverMapUrl || null;
  if (l.messengerUrl !== undefined) row.messenger_url = l.messengerUrl || null;
  if (l.status !== undefined) row.status = l.status;
  if (l.featured !== undefined) row.featured = l.featured;
  if (l.createdAt !== undefined) row.created_at = l.createdAt;
  if (l.latitude !== undefined) row.latitude = l.latitude;
  if (l.longitude !== undefined) row.longitude = l.longitude;
  if (l.paymentType !== undefined) row.payment_type = l.paymentType;
  if (l.titleTranslations !== undefined) row.title_translations = l.titleTranslations;
  if (l.descriptionTranslations !== undefined) row.description_translations = l.descriptionTranslations;
  if (l.addressTranslations !== undefined) row.address_translations = l.addressTranslations;
  if (l.areaTranslations !== undefined) row.area_translations = l.areaTranslations;
  if (l.optionsTranslations !== undefined) row.options_translations = l.optionsTranslations;
  return row;
}

function emit() {
  listeners.forEach((l) => l());
}

// Lightweight column set used for list/grid/map views. Heavy fields like
// description and per-language translation maps are fetched on demand by
// fetchOne() when a user opens a single listing.
const LIST_COLUMNS = [
  "id",
  "title",
  "room_type",
  "city",
  "area",
  "address",
  "monthly_rent",
  "deposit",
  "maintenance_fee",
  "maintenance_included",
  "floor",
  "size",
  "subway_station",
  "subway_minutes",
  "bus_stop",
  "bus_minutes",
  "available_from",
  "options",
  "description",
  "photos",
  "naver_map_url",
  "messenger_url",
  "status",
  "featured",
  "created_at",
  "payment_type",
  "latitude",
  "longitude",
  "title_translations",
  "area_translations",
].join(",");

const fullyLoadedIds = new Set<string>();

async function fetchAll(attempt = 0): Promise<void> {
  const { data, error } = await supabase
    .from("listings")
    .select(LIST_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listings] fetch failed", error);
    // Retry transient connection errors with exponential backoff
    if (attempt < 5) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
      setTimeout(() => { void fetchAll(attempt + 1); }, delay);
    }
    return;
  }
  memoryStore = (data ?? []).map((r) => rowToListing(r as Record<string, unknown>));
  loaded = true;
  emit();
}

async function fetchOne(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[listings] fetch one failed", error);
    return;
  }
  if (!data) return;
  const full = rowToListing(data as Record<string, unknown>);
  fullyLoadedIds.add(id);
  const idx = memoryStore.findIndex((l) => l.id === id);
  if (idx >= 0) {
    memoryStore = memoryStore.map((l) => (l.id === id ? full : l));
  } else {
    memoryStore = [full, ...memoryStore];
  }
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void fetchAll();
  // Realtime subscription so all devices stay in sync.
  supabase
    .channel("listings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "listings" },
      (payload) => {
        if (payload.eventType === "INSERT" && payload.new) {
          const l = rowToListing(payload.new as Record<string, unknown>);
          if (!memoryStore.some((x) => x.id === l.id)) {
            memoryStore = [l, ...memoryStore];
            emit();
            notifyNewListing(l);
          }
        } else if (payload.eventType === "UPDATE" && payload.new) {
          const l = rowToListing(payload.new as Record<string, unknown>);
          const before = memoryStore.find((x) => x.id === l.id);
          memoryStore = memoryStore.map((x) => (x.id === l.id ? l : x));
          emit();
          if (before && before.status === "available" && l.status === "unavailable") {
            notifyRented(l);
          }
        } else if (payload.eventType === "DELETE" && payload.old) {
          const oldId = String((payload.old as { id?: unknown }).id ?? "");
          if (oldId) {
            memoryStore = memoryStore.filter((x) => x.id !== oldId);
            emit();
          }
        }
      },
    )
    .subscribe();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Listing[] {
  ensureInit();
  return memoryStore;
}

const EMPTY_LISTINGS: Listing[] = [];
function getServerSnapshot(): Listing[] {
  return loaded ? memoryStore : EMPTY_LISTINGS;
}

// Stable empty array for SSR / initial render before data loads.
const SAMPLE_FALLBACK = sampleListings;
void SAMPLE_FALLBACK;

export function useListings(): Listing[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useListing(id: string | undefined): Listing | undefined {
  const all = useListings();
  return all.find((l) => l.id === id);
}

export async function addListing(listing: Omit<Listing, "id" | "createdAt">) {
  ensureInit();
  const newL: Listing = {
    ...listing,
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  // Optimistic update
  memoryStore = [newL, ...memoryStore];
  emit();
  const { error } = await supabase.from("listings").insert(listingToRow(newL) as never);
  if (error) {
    console.error("[listings] insert failed", error);
    memoryStore = memoryStore.filter((x) => x.id !== newL.id);
    emit();
    throw error;
  }
  notifyNewListing(newL);
  return newL;
}

export async function updateListing(id: string, patch: Partial<Listing>) {
  ensureInit();
  const before = memoryStore.find((l) => l.id === id);
  memoryStore = memoryStore.map((l) => (l.id === id ? { ...l, ...patch } : l));
  const after = memoryStore.find((l) => l.id === id);
  emit();
  const { error } = await supabase.from("listings").update(listingToRow(patch) as never).eq("id", id);
  if (error) {
    console.error("[listings] update failed", error);
    // Reload from server to recover.
    void fetchAll();
    throw error;
  }
  if (before && after && before.status === "available" && after.status === "unavailable") {
    notifyRented(after);
  }
}

export async function deleteListing(id: string) {
  ensureInit();
  const prev = memoryStore;
  memoryStore = memoryStore.filter((l) => l.id !== id);
  emit();
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) {
    console.error("[listings] delete failed", error);
    memoryStore = prev;
    emit();
    throw error;
  }
}

// ===== Favorites =====
const FAV_KEY = "ger.favorites.v1";
let favs: Set<string> | null = null;
const favListeners = new Set<() => void>();

function loadFavs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(FAV_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function ensureFavs() {
  if (favs === null) favs = loadFavs();
}

function persistFavs() {
  if (typeof window === "undefined" || !favs) return;
  try {
    window.localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
  } catch {
    // ignore persistence failures
  }
  favListeners.forEach((l) => l());
}

export function useFavorites(): Set<string> {
  const [, force] = useState(0);
  useEffect(() => {
    ensureFavs();
    const cb = () => force((n) => n + 1);
    favListeners.add(cb);
    force((n) => n + 1);
    return () => {
      favListeners.delete(cb);
    };
  }, []);
  ensureFavs();
  return favs!;
}

export function toggleFavorite(id: string) {
  ensureFavs();
  if (favs!.has(id)) {
    favs!.delete(id);
  } else {
    favs!.add(id);
    trackSave(id);
  }
  persistFavs();
}

// ===== Admin auth (simple, client-side, password-protected) =====
const AUTH_KEY = "ger.admin.v1";
const authListeners = new Set<() => void>();
let adminSessionMemory = false;

function readAdminSession(): boolean {
  if (typeof window === "undefined") return adminSessionMemory;
  try {
    return window.localStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return adminSessionMemory;
  }
}

function writeAdminSession(value: boolean) {
  adminSessionMemory = value;
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(AUTH_KEY, "1");
    else window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage restrictions and keep the in-memory session for this tab.
  }
}

export function isAdmin(): boolean {
  return readAdminSession();
}

export function loginAdmin(password: string, expected: string): boolean {
  if (password.trim() !== expected) return false;
  writeAdminSession(true);
  authListeners.forEach((l) => l());
  return true;
}

export function logoutAdmin() {
  writeAdminSession(false);
  authListeners.forEach((l) => l());
}

export function useAdmin(): boolean {
  // Always start as false on first render to match SSR output and avoid
  // hydration mismatches. Then sync from localStorage in useEffect.
  const [v, setV] = useState<boolean>(false);
  useEffect(() => {
    setV(isAdmin());
    const cb = () => setV(isAdmin());
    authListeners.add(cb);
    return () => {
      authListeners.delete(cb);
    };
  }, []);
  return v;
}

// ===== Site settings (cover image, etc.) =====
const SETTINGS_KEY = "ger.settings.v1";

export interface SiteSettings {
  coverImageUrl: string;
  // Per-language text overrides. Shape: { [lang]: { [key]: value } }
  // Empty string or missing key = use default from i18n dictionaries.
  textOverrides?: Record<string, Record<string, string>>;
}

export const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1538669715315-155098f0fb1d?auto=format&fit=crop&w=1600&q=80";

const defaultSettings: SiteSettings = {
  coverImageUrl: DEFAULT_COVER_IMAGE,
  textOverrides: {},
};

let settingsStore: SiteSettings | null = null;
const settingsListeners = new Set<() => void>();

function loadSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...(JSON.parse(raw) as Partial<SiteSettings>) };
  } catch {}
  return defaultSettings;
}

function ensureSettings() {
  if (settingsStore === null) settingsStore = loadSettings();
}

function persistSettings() {
  if (typeof window === "undefined" || !settingsStore) return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsStore));
  } catch {}
  settingsListeners.forEach((l) => l());
}

function subSettings(cb: () => void) {
  settingsListeners.add(cb);
  return () => {
    settingsListeners.delete(cb);
  };
}

function getSettingsSnapshot(): SiteSettings {
  ensureSettings();
  return settingsStore!;
}

const getSettingsServerSnapshot = (): SiteSettings => defaultSettings;
export function useSiteSettings(): SiteSettings {
  // Use defaultSettings on first render to match SSR, then hydrate from
  // localStorage after mount to avoid hydration mismatches.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const live = useSyncExternalStore(subSettings, getSettingsSnapshot, getSettingsServerSnapshot);
  return mounted ? live : defaultSettings;
}

export function updateSiteSettings(patch: Partial<SiteSettings>) {
  ensureSettings();
  const next = { ...settingsStore!, ...patch };
  if (
    next.coverImageUrl === settingsStore!.coverImageUrl &&
    next.textOverrides === settingsStore!.textOverrides
  ) {
    return;
  }
  settingsStore = next;
  persistSettings();
}

export function setTextOverride(lang: string, key: string, value: string) {
  ensureSettings();
  const overrides = { ...(settingsStore!.textOverrides || {}) };
  const langMap = { ...(overrides[lang] || {}) };
  const trimmed = value.trim();
  const prev = langMap[key] ?? "";
  if (prev === value || (prev === "" && trimmed === "")) return;
  if (trimmed) langMap[key] = value;
  else delete langMap[key];
  overrides[lang] = langMap;
  settingsStore = { ...settingsStore!, textOverrides: overrides };
  persistSettings();
}

// ===== Listing views (analytics) =====
const VIEWS_KEY = "ger.views.v1";
const SAVES_KEY = "ger.saves.v1";

let viewsStore: Record<string, number> | null = null;
let savesStore: Record<string, number> | null = null;
const analyticsListeners = new Set<() => void>();

function loadViews(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VIEWS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {}
  return {};
}
function loadSaves(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(SAVES_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
  } catch {}
  return {};
}
function ensureAnalytics() {
  if (viewsStore === null) viewsStore = loadViews();
  if (savesStore === null) savesStore = loadSaves();
}
function persistAnalytics() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VIEWS_KEY, JSON.stringify(viewsStore || {}));
    window.localStorage.setItem(SAVES_KEY, JSON.stringify(savesStore || {}));
  } catch {}
  analyticsListeners.forEach((l) => l());
}

export function trackView(id: string) {
  if (!id) return;
  ensureAnalytics();
  viewsStore = { ...viewsStore!, [id]: (viewsStore![id] || 0) + 1 };
  persistAnalytics();
}
export function trackSave(id: string) {
  if (!id) return;
  ensureAnalytics();
  savesStore = { ...savesStore!, [id]: (savesStore![id] || 0) + 1 };
  persistAnalytics();
}

let analyticsSnapshot: { views: Record<string, number>; saves: Record<string, number> } = {
  views: {},
  saves: {},
};

function getAnalyticsSnapshot() {
  ensureAnalytics();
  if (analyticsSnapshot.views !== viewsStore || analyticsSnapshot.saves !== savesStore) {
    analyticsSnapshot = { views: viewsStore!, saves: savesStore! };
  }
  return analyticsSnapshot;
}
function subAnalytics(cb: () => void) {
  analyticsListeners.add(cb);
  return () => {
    analyticsListeners.delete(cb);
  };
}
const EMPTY_ANALYTICS: { views: Record<string, number>; saves: Record<string, number> } = {
  views: {},
  saves: {},
};
const getAnalyticsServerSnapshot = () => EMPTY_ANALYTICS;
export function useAnalytics() {
  return useSyncExternalStore(subAnalytics, getAnalyticsSnapshot, getAnalyticsServerSnapshot);
}

// ===== City notification subscriptions =====
const SUBS_KEY = "ger.subs.v1";
let subsStore: Set<string> | null = null;
const subsListeners = new Set<() => void>();

function loadSubs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(SUBS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}
function ensureSubs() {
  if (subsStore === null) subsStore = loadSubs();
}
function persistSubs() {
  if (typeof window === "undefined" || !subsStore) return;
  try {
    window.localStorage.setItem(SUBS_KEY, JSON.stringify([...subsStore]));
  } catch {}
  subsListeners.forEach((l) => l());
}
function getSubsSnapshot(): Set<string> {
  ensureSubs();
  return subsStore!;
}
function subSubs(cb: () => void) {
  subsListeners.add(cb);
  return () => {
    subsListeners.delete(cb);
  };
}
const EMPTY_SUBS: Set<string> = new Set();
const getSubsServerSnapshot = (): Set<string> => EMPTY_SUBS;
export function useCitySubscriptions(): Set<string> {
  return useSyncExternalStore(subSubs, getSubsSnapshot, getSubsServerSnapshot);
}
export function toggleCitySubscription(city: string) {
  ensureSubs();
  const next = new Set(subsStore);
  if (next.has(city)) next.delete(city);
  else next.add(city);
  subsStore = next;
  persistSubs();
}

// ===== Notifications inbox =====
export interface AppNotification {
  id: string;
  kind: "newListing" | "rented";
  title: string;
  message: string;
  listingId?: string;
  city?: string;
  createdAt: number;
  read: boolean;
}

const NOTIF_KEY = "ger.notifs.v1";
let notifStore: AppNotification[] | null = null;
const notifListeners = new Set<() => void>();

function loadNotifs(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw) as AppNotification[];
  } catch {}
  return [];
}
function ensureNotifs() {
  if (notifStore === null) notifStore = loadNotifs();
}
function persistNotifs() {
  if (typeof window === "undefined" || !notifStore) return;
  try {
    window.localStorage.setItem(NOTIF_KEY, JSON.stringify(notifStore));
  } catch {}
  notifListeners.forEach((l) => l());
}
function pushNotif(n: Omit<AppNotification, "id" | "createdAt" | "read">) {
  ensureNotifs();
  const full: AppNotification = {
    ...n,
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
    read: false,
  };
  notifStore = [full, ...notifStore!].slice(0, 200);
  persistNotifs();
}
function getNotifsSnapshot(): AppNotification[] {
  ensureNotifs();
  return notifStore!;
}
function subNotifs(cb: () => void) {
  notifListeners.add(cb);
  return () => {
    notifListeners.delete(cb);
  };
}
const EMPTY_NOTIFS: AppNotification[] = [];
const getNotifsServerSnapshot = (): AppNotification[] => EMPTY_NOTIFS;
export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(subNotifs, getNotifsSnapshot, getNotifsServerSnapshot);
}
export function markNotificationRead(id: string) {
  ensureNotifs();
  notifStore = notifStore!.map((n) => (n.id === id ? { ...n, read: true } : n));
  persistNotifs();
}
export function markAllNotificationsRead() {
  ensureNotifs();
  notifStore = notifStore!.map((n) => ({ ...n, read: true }));
  persistNotifs();
}
export function clearNotifications() {
  notifStore = [];
  persistNotifs();
}

function notifyNewListing(listing: Listing) {
  ensureSubs();
  if (!subsStore!.has(listing.city)) return;
  pushNotif({
    kind: "newListing",
    title: "Шинэ байр нэмэгдлээ",
    message: listing.title,
    listingId: listing.id,
    city: listing.city,
  });
}

function notifyRented(listing: Listing) {
  ensureFavs();
  if (!favs!.has(listing.id)) return;
  pushNotif({
    kind: "rented",
    title: "Хадгалсан байр түрээслэгдсэн",
    message: listing.title,
    listingId: listing.id,
    city: listing.city,
  });
}

// ===== Translation helper (calls translate-listing edge function) =====
export interface TranslateInput {
  sourceLang?: "mn" | "ko" | "en" | "ru" | "zh" | "vi";
  fields: {
    title?: string;
    description?: string;
    address?: string;
    area?: string;
    options?: string[];
  };
}

export interface TranslateResult {
  titleTranslations?: Record<string, string>;
  descriptionTranslations?: Record<string, string>;
  addressTranslations?: Record<string, string>;
  areaTranslations?: Record<string, string>;
  optionsTranslations?: Record<string, string[]>;
}

export async function translateListingFields(
  input: TranslateInput,
): Promise<TranslateResult> {
  const { data, error } = await supabase.functions.invoke<TranslateResult>(
    "translate-listing",
    { body: input },
  );
  if (error) {
    console.error("[translate-listing] failed", error);
    throw error;
  }
  return data ?? {};
}

// ===== Cities & Room Types (dynamic from DB) =====
export type CityRow = {
  id: string;
  parent_id: string | null;
  name_mn: string;
  name_ko: string;
  name_en: string;
  name_ru: string;
  name_zh: string;
  name_vi: string;
  emoji: string;
  sort_order: number;
};
export type RoomTypeRow = Omit<CityRow, "parent_id">;

export function cityName(row: CityRow | undefined, lang: string): string {
  if (!row) return "";
  const key = `name_${lang}` as keyof CityRow;
  const v = row[key];
  return (typeof v === "string" && v.trim()) ? v : row.name_mn || row.name_ko || row.id;
}
export function roomTypeName(row: RoomTypeRow | undefined, lang: string): string {
  if (!row) return "";
  const key = `name_${lang}` as keyof RoomTypeRow;
  const v = row[key];
  return (typeof v === "string" && v.trim()) ? v : row.name_mn || row.name_ko || row.id;
}

export function useCitiesData(): CityRow[] {
  const [rows, setRows] = useState<CityRow[]>([]);
  useEffect(() => {
    let active = true;
    supabase
      .from("cities")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (active && data) setRows(data as unknown as CityRow[]);
      });
    return () => {
      active = false;
    };
  }, []);
  return rows;
}

export function useRoomTypesData(): RoomTypeRow[] {
  const [rows, setRows] = useState<RoomTypeRow[]>([]);
  useEffect(() => {
    let active = true;
    supabase
      .from("room_types")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (active && data) setRows(data as unknown as RoomTypeRow[]);
      });
    return () => {
      active = false;
    };
  }, []);
  return rows;
}

// Global cache for cities & room types so UI components can resolve names by id synchronously.
let citiesCache: CityRow[] = [];
let roomTypesCache: RoomTypeRow[] = [];
const refDirListeners = new Set<() => void>();

async function loadReferenceDirs() {
  const [c, r] = await Promise.all([
    supabase.from("cities").select("*").order("sort_order", { ascending: true }),
    supabase.from("room_types").select("*").order("sort_order", { ascending: true }),
  ]);
  if (c.data) citiesCache = c.data as unknown as CityRow[];
  if (r.data) roomTypesCache = r.data as unknown as RoomTypeRow[];
  refDirListeners.forEach((l) => l());
}

let referenceLoaded = false;
function ensureReferenceLoaded() {
  if (referenceLoaded) return;
  referenceLoaded = true;
  loadReferenceDirs();
}

export function lookupCityName(id: string | undefined, lang: string): string {
  if (!id) return "";
  ensureReferenceLoaded();
  const row = citiesCache.find((c) => c.id === id);
  if (!row) return id;
  const v = (row as any)[`name_${lang}`];
  return (typeof v === "string" && v.trim()) ? v : row.name_mn || row.name_ko || id;
}
export function lookupRoomTypeName(id: string | undefined, lang: string): string {
  if (!id) return "";
  ensureReferenceLoaded();
  const row = roomTypesCache.find((r) => r.id === id);
  if (!row) return id;
  const v = (row as any)[`name_${lang}`];
  return (typeof v === "string" && v.trim()) ? v : row.name_mn || row.name_ko || id;
}

export function useReferenceData() {
  const subscribe = (cb: () => void) => {
    refDirListeners.add(cb);
    return () => { refDirListeners.delete(cb); };
  };
  const get = () => citiesCache.length + roomTypesCache.length;
  useSyncExternalStore(subscribe, get, () => 0);
  ensureReferenceLoaded();
  return { cities: citiesCache, roomTypes: roomTypesCache };
}
