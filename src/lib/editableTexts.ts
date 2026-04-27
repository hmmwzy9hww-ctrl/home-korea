// Keys that admins can override from the admin panel.
// Kept intentionally small — only the most prominent/marketing-style strings.
// Defaults still come from src/lib/i18n.ts; overrides win when set.
export interface EditableTextItem {
  key: string;
  group: string;
  label: string;
  multiline?: boolean;
}

export const EDITABLE_TEXTS: EditableTextItem[] = [
  // Brand
  { key: "brand", group: "Brand", label: "Brand name" },
  { key: "tagline", group: "Brand", label: "Tagline" },

  // Top bar
  { key: "search.placeholder", group: "Top bar", label: "Search placeholder" },

  // Bottom nav
  { key: "nav.home", group: "Bottom nav", label: "Home label" },
  { key: "nav.search", group: "Bottom nav", label: "Search label" },
  { key: "nav.favorites", group: "Bottom nav", label: "Favorites label" },

  // Home hero
  { key: "home.hero.title", group: "Home hero", label: "Hero title", multiline: true },
  { key: "home.hero.sub", group: "Home hero", label: "Hero subtitle", multiline: true },
  { key: "home.cta.browse", group: "Home hero", label: "Browse CTA button" },

  // Home sections
  { key: "home.section.cities", group: "Home sections", label: "Map section heading" },
  { key: "home.section.cityStats", group: "Home sections", label: "City stats heading" },
  { key: "home.section.quick", group: "Home sections", label: "Quick search heading" },
  { key: "home.section.featured", group: "Home sections", label: "Featured heading" },
  { key: "home.section.latest", group: "Home sections", label: "Latest heading" },

  // Other page titles
  { key: "listings.title", group: "Other pages", label: "Listings page title" },
  { key: "fav.title", group: "Other pages", label: "Favorites page title" },
  { key: "fav.empty", group: "Other pages", label: "Favorites empty message", multiline: true },
  { key: "listings.empty", group: "Other pages", label: "Listings empty message", multiline: true },
];

export const EDITABLE_TEXT_KEYS = new Set(EDITABLE_TEXTS.map((t) => t.key));
