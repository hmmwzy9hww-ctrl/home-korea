import type { City, Listing } from "./types";

export const CITY_CENTERS: Record<City, [number, number]> = {
  seoul: [37.5665, 126.978],
  incheon: [37.4563, 126.7052],
  gyeonggi: [37.4138, 127.5183],
  busan: [35.1796, 129.0756],
  other: [36.5, 127.85],
};

// Deterministic hash → [-1, 1)
function hash01(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [-1, 1)
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

/**
 * Approximate lat/lng for a listing: city center + deterministic jitter
 * based on the listing id. ~3km spread.
 */
export function getListingCoords(listing: Listing): [number, number] {
  // Use real coordinates if present
  if (
    typeof listing.latitude === "number" &&
    typeof listing.longitude === "number" &&
    Number.isFinite(listing.latitude) &&
    Number.isFinite(listing.longitude)
  ) {
    return [listing.latitude, listing.longitude];
  }
  const [lat, lng] = CITY_CENTERS[listing.city] ?? CITY_CENTERS.other;
  const jLat = hash01(listing.id + ":lat") * 0.025; // ~2.7km
  const jLng = hash01(listing.id + ":lng") * 0.03;
  return [lat + jLat, lng + jLng];
}

export function getCityCenter(city: City | undefined): [number, number] {
  return CITY_CENTERS[city ?? "seoul"];
}

function isValidKoreaCoord(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
}

/**
 * Parse coordinates from a Naver Map URL. Handles common patterns:
 *  - ?lat=...&lng=... / ?y=...&x=...
 *  - @lat,lng
 *  - c=lng,lat,zoom (or any pair of consecutive valid Korea coords)
 *  - generic: any two consecutive decimal numbers that fall in Korea bounds
 * Returns null when no valid pair is found, or for short URLs that need to be
 * expanded server-side first (use the expand-naver-url edge function).
 */
export function parseNaverCoords(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const sp = u.searchParams;

    const latKeys = ["lat", "latitude", "y"];
    const lngKeys = ["lng", "lon", "long", "longitude", "x"];
    let lat: number | null = null;
    let lng: number | null = null;
    for (const k of latKeys) {
      const v = sp.get(k);
      if (v != null && !isNaN(Number(v))) { lat = Number(v); break; }
    }
    for (const k of lngKeys) {
      const v = sp.get(k);
      if (v != null && !isNaN(Number(v))) { lng = Number(v); break; }
    }
    if (lat != null && lng != null && isValidKoreaCoord(lat, lng)) {
      return { lat, lng };
    }

    const full = u.href;
    const at = full.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) {
      const a = Number(at[1]);
      const b = Number(at[2]);
      if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
      if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
    }

    const c = sp.get("c");
    if (c) {
      const parts = c.split(",").map((p) => Number(p)).filter((n) => !isNaN(n));
      for (let i = 0; i < parts.length - 1; i++) {
        const a = parts[i], b = parts[i + 1];
        if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
        if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
      }
    }

    const all = [...full.matchAll(/(-?\d{2,3}\.\d{3,})/g)].map((m) => Number(m[1]));
    for (let i = 0; i < all.length - 1; i++) {
      const a = all[i], b = all[i + 1];
      if (isValidKoreaCoord(a, b)) return { lat: a, lng: b };
      if (isValidKoreaCoord(b, a)) return { lat: b, lng: a };
    }
    return null;
  } catch {
    return null;
  }
}

/** True for short URLs (naver.me, me2.do, kko.to) that must be expanded server-side. */
export function isShortNaverUrl(url: string): boolean {
  if (!url) return false;
  return /(?:^|\/\/)(naver\.me|me2\.do|kko\.to|maps\.app\.goo\.gl|goo\.gl)\//i.test(url);
}

/**
 * Resolve coords from a Naver Map URL. Tries client-side parse first; if that
 * fails (e.g. short URL), calls the expand-naver-url edge function.
 */
export async function resolveNaverCoords(
  url: string,
  invokeFn: (body: { url: string }) => Promise<{ coords?: { lat: number; lng: number } | null } | null>,
): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;
  const direct = parseNaverCoords(url);
  if (direct) return direct;
  try {
    const res = await invokeFn({ url });
    if (res && res.coords && isValidKoreaCoord(res.coords.lat, res.coords.lng)) {
      return res.coords;
    }
  } catch {
    // ignore
  }
  return null;
}

