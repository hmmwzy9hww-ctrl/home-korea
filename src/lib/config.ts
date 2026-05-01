// Ерөнхий тохиргоо. Messenger хуудас болон админ нууц үгийг энд солино.
export const MESSENGER_PAGE = "my.home.korean";
export const DEFAULT_MESSENGER_URL = `https://m.me/${MESSENGER_PAGE}`;
export const ADMIN_PASSWORD = "admin123";

// Production site origin used to build clean, shareable listing URLs that
// preview nicely (with photo + title) inside Facebook Messenger inbox.
export const PUBLIC_SITE_URL = "https://home-korea.lovable.app";

/**
 * Build a clean canonical listing URL (no query params, no preview subdomain)
 * so Facebook can fetch OpenGraph tags and show a thumbnail + title in the inbox.
 */
export function buildListingUrl(listingId: string): string {
  return `${PUBLIC_SITE_URL}/listing/${listingId}`;
}

/**
 * Build a Messenger link to OUR page (m.me/my.home.korean) with a pre-filled
 * message containing the listing title and a clean canonical URL.
 */
export function buildMessengerUrl(opts: {
  listingId?: string;
  listingTitle?: string;
  listingUrl?: string;
  override?: string;
}): string {
  const cleanUrl =
    opts.listingId ? buildListingUrl(opts.listingId) : (opts.listingUrl || "");

  const titlePart = opts.listingTitle ? `"${opts.listingTitle}"` : "энэ байр";

  const message = cleanUrl
    ? `Сайн байна уу, ${titlePart} байрыг сонирхож байна.\n${cleanUrl}`
    : `Сайн байна уу, ${titlePart} байрыг сонирхож байна.`;

  return `${DEFAULT_MESSENGER_URL}?text=${encodeURIComponent(message)}`;
}
