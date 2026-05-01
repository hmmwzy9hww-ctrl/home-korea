import type { Listing, LangCode, Translations, ArrayTranslations } from "./types";

const FALLBACK_ORDER: LangCode[] = ["mn", "ko", "en", "ru", "zh", "vi"];

export function pickTranslation(
  translations: Translations | undefined,
  lang: string,
  fallback: string,
): string {
  if (!translations) return fallback;
  const direct = translations[lang as LangCode];
  if (direct && direct.trim()) return direct;
  for (const l of FALLBACK_ORDER) {
    const v = translations[l];
    if (v && v.trim()) return v;
  }
  return fallback;
}

export function pickArrayTranslation(
  translations: ArrayTranslations | undefined,
  lang: string,
  fallback: string[],
): string[] {
  if (!translations) return fallback;
  const direct = translations[lang as LangCode];
  if (direct && direct.length) return direct;
  for (const l of FALLBACK_ORDER) {
    const v = translations[l];
    if (v && v.length) return v;
  }
  return fallback;
}

export function listingTitle(listing: Listing, lang: string): string {
  return pickTranslation(listing.titleTranslations, lang, listing.title);
}
export function listingDescription(listing: Listing, lang: string): string {
  return pickTranslation(listing.descriptionTranslations, lang, listing.description);
}
export function listingAddress(listing: Listing, lang: string): string {
  return pickTranslation(listing.addressTranslations, lang, listing.address);
}
export function listingArea(listing: Listing, lang: string): string {
  return pickTranslation(listing.areaTranslations, lang, listing.area);
}
export function listingOptions(listing: Listing, lang: string): string[] {
  return pickArrayTranslation(listing.optionsTranslations, lang, listing.options);
}
