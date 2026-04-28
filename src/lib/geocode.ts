import type { Listing } from "./types";
import { getCityCenter, getListingCoords } from "./coords";

type Coords = [number, number];

const STORAGE_KEY = "geocode-cache-v2";
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

/**
 * Clean a Korean address by removing building names, unit/floor numbers,
 * and parenthetical notes that confuse Nominatim.
 *
 * Keeps tokens that are admin areas (시/도/구/군/동/읍/면/리/로/길) or
 * pure jibun numbers like "378-1" / "1058".
 */
function cleanAddress(raw: string): string {
  if (!raw) return "";
  // Remove parentheses and their contents: "1158(라온)" -> "1158"
  let s = raw.replace(/\([^)]*\)/g, " ");
  // Drop common unit/floor markers and what follows them on that token
  // e.g. "1006호", "101동", "4층", "B1", "지하1"
  const tokens = s.split(/\s+/).filter(Boolean);
  const adminSuffix = /(시|도|구|군|동|읍|면|리|로|길|가)$/;
  const jibun = /^\d+(-\d+)?$/;
  const kept: string[] = [];
  for (const t of tokens) {
    // Stop including tokens once we hit a building/unit marker
    if (/(호|층|동$|실|관|빌딩|빌라|아파트|오피스텔|상가|건물)/.test(t)) {
      // "101동" is ambiguous (could be admin 동 or building 동). Treat
      // pure-numeric-prefixed 동 as a building unit.
      if (/^\d+동$/.test(t)) break;
      if (t.endsWith("동") && !/^\d/.test(t)) {
        kept.push(t);
        continue;
      }
      break;
    }
    if (adminSuffix.test(t) || jibun.test(t)) {
      kept.push(t);
    } else if (kept.length === 0) {
      // Allow leading non-matching tokens (rare); still useful context
      kept.push(t);
    }
  }
  return kept.join(" ").trim();
}

/** Extract the dong/gu portion of an address as a coarse fallback. */
function extractDongGu(raw: string): string {
  if (!raw) return "";
  const cleaned = cleanAddress(raw);
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  const adminOnly = tokens.filter((t) => /(시|도|구|군|동|읍|면|리)$/.test(t));
  return adminOnly.join(" ").trim();
}

/**
 * Build an ordered list of geocoding queries from most specific to least.
 * The first one returning a hit is cached and used.
 */
function buildQueries(listing: Listing): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (q: string) => {
    const k = q.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  };

  const addr = (listing.address || "").trim();
  const area = (listing.area || "").trim();

  // 1) Full cleaned address
  if (addr) push(`${cleanAddress(addr)}, South Korea`);
  // 2) Cleaned address + area (helps when address omits the city/gu)
  if (addr && area) push(`${cleanAddress(addr)}, ${area}, South Korea`);
  // 3) Dong/gu of address (fallback)
  const dongGu = extractDongGu(addr);
  if (dongGu) push(`${dongGu}, South Korea`);
  // 4) Area field as last resort
  if (area) push(`${cleanAddress(area)}, South Korea`);

  return out;
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
    )}&format=json&limit=1&accept-language=ko&countrycodes=kr`;
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

/** Stable cache key per listing (independent of query variant chosen). */
function cacheKey(listing: Listing): string {
  return `${(listing.address || "").trim()}|${(listing.area || "").trim()}`;
}

export function getCachedCoords(listing: Listing): Coords | null {
  loadCache();
  const k = cacheKey(listing);
  if (!k.replace("|", "")) return null;
  return memCache.get(k) ?? null;
}

export async function geocodeListing(listing: Listing): Promise<Coords | null> {
  loadCache();
  const k = cacheKey(listing);
  if (!k.replace("|", "")) return null;
  if (memCache.has(k)) return memCache.get(k)!;
  if (inflight.has(k)) return inflight.get(k)!;

  const queries = buildQueries(listing);
  if (queries.length === 0) return null;

  const p = (async () => {
    for (const q of queries) {
      const coords = await fetchNominatim(q);
      if (coords) {
        memCache.set(k, coords);
        persist();
        return coords;
      }
    }
    return null;
  })();
  inflight.set(k, p);
  try {
    return await p;
  } finally {
    inflight.delete(k);
  }
}

/** Returns precise coords if cached/known, else falls back to city-jitter coords. */
export function getDisplayCoords(listing: Listing): Coords {
  return getCachedCoords(listing) ?? getListingCoords(listing);
}

export { getCityCenter };
