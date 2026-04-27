// Ерөнхий тохиргоо. Messenger хуудас болон админ нууц үгийг энд солино.
export const MESSENGER_PAGE = "homekorea";
export const DEFAULT_MESSENGER_URL = `https://m.me/${MESSENGER_PAGE}`;
export const ADMIN_PASSWORD = "admin123";

/**
 * Build a Messenger link with a pre-filled message that references the
 * current listing URL. Falls back gracefully if listingUrl is missing.
 */
export function buildMessengerUrl(opts: {
  listingTitle?: string;
  listingUrl?: string;
  override?: string;
}): string {
  const url = opts.listingUrl || (typeof window !== "undefined" ? window.location.href : "");
  const message = url
    ? `Сайн байна уу, энэ байрыг сонирхож байна: ${url}`
    : `Сайн байна уу, таны зарласан байрыг сонирхож байна.`;

  return `${DEFAULT_MESSENGER_URL}?text=${encodeURIComponent(message)}`;
}
