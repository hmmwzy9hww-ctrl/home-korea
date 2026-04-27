import type { Listing } from "./types";

export function getListingLocationText(listing: Pick<Listing, "address" | "area" | "subwayStation">): string {
  const address = listing.address?.trim();
  if (address) return address;

  return [listing.area?.trim(), listing.subwayStation?.trim()].filter(Boolean).join(" ");
}

export function buildNaverMapSearchUrl(address: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}