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
    roomType: (row.room_type as RoomType) ?? "oneRoom",
    city: (row.city as City) ?? "other",
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
    paymentType: (row.payment_type as "monthly" | "quarterly") ?? "monthly",
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    descriptionTranslations:
      row.description_translations && typeof row.description_translations === "object"
        ? (row.description_translations as Record<string, string>)
        : {},
    createdAt: Number(row.created_at ?? Date.now()),
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
  if (l.paymentType !== undefined) row.payment_type = l.paymentType;
  if (l.latitude !== undefined) row.latitude = l.latitude;
  if (l.longitude !== undefined) row.longitude = l.longitude;
  if (l.descriptionTranslations !== undefined)
    row.description_translations = l.descriptionTranslations ?? {};
  if (l.createdAt !== undefined) row.created_at = l.createdAt;
  return row;
}

function emit() {
  listeners.forEach((l) => l());
}

async function fetchAll() {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listings] fetch failed", error);
    return;
  }
  memoryStore = (data ?? []).map((r) => rowToListing(r as Record<string, unknown>));
  loaded = true;
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

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEY) === "1";
}

export function loginAdmin(password: string, expected: string): boolean {
  if (password !== expected) return false;
  if (typeof window !== "undefined") window.localStorage.setItem(AUTH_KEY, "1");
  authListeners.forEach((l) => l());
  return true;
}

export function logoutAdmin() {
  if (typeof window !== "undefined") window.localStorage.removeItem(AUTH_KEY);
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

const SETTINGS_ROW_ID = "global";
const SETTINGS_CACHE_KEY = "ger.settings.cache.v2";

let settingsStore: SiteSettings | null = null;
let settingsInitialized = false;
let settingsLoaded = false;
const settingsListeners = new Set<() => void>();

function rowToSettings(row: Record<string, unknown>): SiteSettings {
  const cover = String(row.cover_image_url ?? "") || DEFAULT_COVER_IMAGE;
  const overrides =
    row.text_overrides && typeof row.text_overrides === "object"
      ? (row.text_overrides as Record<string, Record<string, string>>)
      : {};
  return { coverImageUrl: cover, textOverrides: overrides };
}

function loadCachedSettings(): SiteSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_CACHE_KEY);
    if (raw) return { ...defaultSettings, ...(JSON.parse(raw) as Partial<SiteSettings>) };
  } catch {}
  return defaultSettings;
}

function cacheSettings(s: SiteSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(s));
  } catch {}
}

async function fetchSettings() {
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", SETTINGS_ROW_ID)
    .maybeSingle();
  if (error) {
    console.error("[site_settings] fetch failed", error);
    return;
  }
  if (data) {
    settingsStore = rowToSettings(data as Record<string, unknown>);
    settingsLoaded = true;
    cacheSettings(settingsStore);
    settingsListeners.forEach((l) => l());
  }
}

function ensureSettings() {
  if (settingsStore === null) settingsStore = loadCachedSettings();
  if (settingsInitialized || typeof window === "undefined") return;
  settingsInitialized = true;
  void fetchSettings();
  supabase
    .channel("site-settings-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "site_settings" },
      (payload) => {
        if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && payload.new) {
          settingsStore = rowToSettings(payload.new as Record<string, unknown>);
          settingsLoaded = true;
          cacheSettings(settingsStore);
          settingsListeners.forEach((l) => l());
        }
      },
    )
    .subscribe();
}

async function persistSettingsRemote(s: SiteSettings) {
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        id: SETTINGS_ROW_ID,
        cover_image_url: s.coverImageUrl,
        text_overrides: s.textOverrides ?? {},
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "id" },
    );
  if (error) console.error("[site_settings] upsert failed", error);
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
  cacheSettings(settingsStore);
  settingsListeners.forEach((l) => l());
  void persistSettingsRemote(settingsStore);
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
  cacheSettings(settingsStore);
  settingsListeners.forEach((l) => l());
  void persistSettingsRemote(settingsStore);
}

// Suppress unused warning for legacy key
void SETTINGS_KEY;
void settingsLoaded;

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
