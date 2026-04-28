import type { Listing } from "./types";
import { getCityCenter, getListingCoords } from "./coords";

type Coords = [number, number];

const STORAGE_KEY = "geocode-cache-v1";
const memCache = new Map<string, Coords>();
const inflight = new Map<string, Promise<Coords | null>>();

let loaded = false;
function loadCache() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, Coords>;
      for (const [k, v] of Object.entries(obj)) memCache.set(k, v);
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, Coords> = {};
    memCache.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

function buildQuery(listing: Listing): string {
  const parts = [listing.address, listing.area].filter((s) => s && s.trim());
  const q = parts.join(", ").trim();
  // Bias to South Korea for better matches
  return q ? `${q}, South Korea` : "";
}

// Throttle to respect Nominatim usage policy (1 req/sec)
let lastCall = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastCall));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function fetchNominatim(query: string): Promise<Coords | null> {
  await throttle();
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query,
    )}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lon = parseFloat(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return [lat, lon];
  } catch {
    return null;
  }
}

export function getCachedCoords(listing: Listing): Coords | null {
  loadCache();
  const q = buildQuery(listing);
  if (!q) return null;
  return memCache.get(q) ?? null;
}

export async function geocodeListing(listing: Listing): Promise<Coords | null> {
  loadCache();
  const q = buildQuery(listing);
  if (!q) return null;
  if (memCache.has(q)) return memCache.get(q)!;
  if (inflight.has(q)) return inflight.get(q)!;
  const p = (async () => {
    const coords = await fetchNominatim(q);
    if (coords) {
      memCache.set(q, coords);
      persist();
    }
    return coords;
  })();
  inflight.set(q, p);
  try {
    return await p;
  } finally {
    inflight.delete(q);
  }
}

/** Returns precise coords if cached/known, else falls back to city-jitter coords. */
export function getDisplayCoords(listing: Listing): Coords {
  return getCachedCoords(listing) ?? getListingCoords(listing);
}

export { getCityCenter };
