import type { Listing } from "./types";
import { getCityCenter, getListingCoords } from "./coords";
import { geocodeAddress } from "@/server/geocode.functions";

type Coords = [number, number];

const STORAGE_KEY = "geocode-cache-v4";
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

  const p = (async () => {
    try {
      const result = await geocodeAddress({
        data: { address: listing.address, area: listing.area },
      });
      if (result) {
        const coords: Coords = [result.lat, result.lon];
        memCache.set(k, coords);
        persist();
        return coords;
      }
    } catch {
      /* swallow */
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

export function getDisplayCoords(listing: Listing): Coords {
  return getCachedCoords(listing) ?? getListingCoords(listing);
}

export { getCityCenter };
