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
  const [lat, lng] = CITY_CENTERS[listing.city] ?? CITY_CENTERS.other;
  const jLat = hash01(listing.id + ":lat") * 0.025; // ~2.7km
  const jLng = hash01(listing.id + ":lng") * 0.03;
  return [lat + jLat, lng + jLng];
}

export function getCityCenter(city: City | undefined): [number, number] {
  return CITY_CENTERS[city ?? "seoul"];
}
