// Listings store with localStorage. Easy to swap for Lovable Cloud later.
import { useEffect, useState, useSyncExternalStore } from "react";
import { sampleListings } from "./sampleData";
import type { Listing } from "./types";

const KEY = "ger.listings.v1";
const SEED_KEY = "ger.seeded.v1";

let memoryStore: Listing[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function load(): Listing[] {
  if (typeof window === "undefined") return sampleListings;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Listing[];
  } catch {
    // ignore
  }
  return [];
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memoryStore));
  } catch {
    // ignore persistence failures so the UI still updates in-memory on Safari/private mode
  }
  listeners.forEach((l) => l());
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const seeded = window.localStorage.getItem(SEED_KEY);
  const existing = load();
  if (!seeded || existing.length === 0) {
    memoryStore = [...sampleListings];
    window.localStorage.setItem(SEED_KEY, "1");
    persist();
  } else {
    memoryStore = existing;
  }
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

function getServerSnapshot(): Listing[] {
  return sampleListings;
}

export function useListings(): Listing[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useListing(id: string | undefined): Listing | undefined {
  const all = useListings();
  return all.find((l) => l.id === id);
}

export function addListing(listing: Omit<Listing, "id" | "createdAt">) {
  ensureInit();
  const newL: Listing = {
    ...listing,
    id: `l_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  memoryStore = [newL, ...memoryStore];
  persist();
  // Notify subscribers of this city about the new listing.
  notifyNewListing(newL);
  return newL;
}

export function updateListing(id: string, patch: Partial<Listing>) {
  ensureInit();
  const before = memoryStore.find((l) => l.id === id);
  memoryStore = memoryStore.map((l) => (l.id === id ? { ...l, ...patch } : l));
  const after = memoryStore.find((l) => l.id === id);
  // If a previously available listing is now marked rented, notify users
  // who saved it.
  if (before && after && before.status === "available" && after.status === "unavailable") {
    notifyRented(after);
  }
  persist();
}

export function deleteListing(id: string) {
  ensureInit();
  memoryStore = memoryStore.filter((l) => l.id !== id);
  persist();
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
  // Initialize synchronously from localStorage to avoid a false "logged out"
  // flash on first render of admin pages.
  const [v, setV] = useState<boolean>(() => isAdmin());
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

export function useSiteSettings(): SiteSettings {
  return useSyncExternalStore(subSettings, getSettingsSnapshot, () => defaultSettings);
}

export function updateSiteSettings(patch: Partial<SiteSettings>) {
  ensureSettings();
  settingsStore = { ...settingsStore!, ...patch };
  persistSettings();
}

export function setTextOverride(lang: string, key: string, value: string) {
  ensureSettings();
  const overrides = { ...(settingsStore!.textOverrides || {}) };
  const langMap = { ...(overrides[lang] || {}) };
  const trimmed = value.trim();
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
  viewsStore![id] = (viewsStore![id] || 0) + 1;
  persistAnalytics();
}
export function trackSave(id: string) {
  if (!id) return;
  ensureAnalytics();
  savesStore![id] = (savesStore![id] || 0) + 1;
  persistAnalytics();
}

function getAnalyticsSnapshot() {
  ensureAnalytics();
  return { views: viewsStore!, saves: savesStore! };
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
  if (subsStore!.has(city)) subsStore!.delete(city);
  else subsStore!.add(city);
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
