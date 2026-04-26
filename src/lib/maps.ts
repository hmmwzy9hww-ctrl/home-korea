import type { Listing } from "./types";

export function getListingLocationText(listing: Pick<Listing, "address" | "area" | "subwayStation">): string {
  const address = listing.address?.trim();
  if (address) return address;

  return [listing.area?.trim(), listing.subwayStation?.trim()].filter(Boolean).join(" ");
}

export function buildGoogleMapsSearchUrl(location: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}