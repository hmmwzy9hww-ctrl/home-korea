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
  override?: string; // per-listing custom messenger url, if any
}): string {
  const base = opts.override?.trim() || DEFAULT_MESSENGER_URL;

  // If the admin already provided a fully-formed link with its own ?text=, respect it.
  if (opts.override && /[?&]text=/.test(opts.override)) return opts.override;

  const url = opts.listingUrl || (typeof window !== "undefined" ? window.location.href : "");
  const message = url
    ? `Сайн байна уу, энэ байрыг сонирхож байна: ${url}`
    : `Сайн байна уу, таны зарласан байрыг сонирхож байна.`;

  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}text=${encodeURIComponent(message)}`;
}
