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
  if (favs!.has(id)) favs!.delete(id);
  else favs!.add(id);
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
}

export const DEFAULT_COVER_IMAGE =
  "https://images.unsplash.com/photo-1538669715315-155098f0fb1d?auto=format&fit=crop&w=1600&q=80";

const defaultSettings: SiteSettings = {
  coverImageUrl: DEFAULT_COVER_IMAGE,
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
