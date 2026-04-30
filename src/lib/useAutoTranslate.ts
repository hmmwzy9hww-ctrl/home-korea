import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LANGS = ["mn", "ko", "en", "ru", "zh", "vi"] as const;
type Lang = (typeof LANGS)[number];

type Field = "title" | "description";

// In-memory cache: `${field}:${id}:${lang}` -> translated string
const memCache = new Map<string, string>();

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, value); } catch { /* ignore quota */ }
}

function detectSourceLang(text: string): Lang {
  if (/[\u0400-\u04FF]/.test(text)) return "mn"; // Cyrillic → assume Mongolian
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  return "en";
}

function cacheGet(field: Field, id: string, lang: string): string | null {
  const memKey = `${field}:${id}:${lang}`;
  const m = memCache.get(memKey);
  if (m) return m;
  const ls = lsGet(`tr:${field}:${id}:${lang}`);
  if (ls) {
    memCache.set(memKey, ls);
    return ls;
  }
  return null;
}

function cacheSet(field: Field, id: string, lang: string, value: string) {
  if (!value) return;
  memCache.set(`${field}:${id}:${lang}`, value);
  lsSet(`tr:${field}:${id}:${lang}`, value);
}

// In-flight request dedupe so multiple cards / prefetches don't fire dupes.
const inflight = new Map<string, Promise<Record<string, { title?: string; description?: string }> | null>>();

async function invokeWithRetry(
  body: { sourceLang: Lang; fields: { title?: string; description?: string } },
  attempt = 0,
): Promise<{ titleTranslations?: Record<string, string>; descriptionTranslations?: Record<string, string> } | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-listing", { body });
    if (error || !data) {
      // Retry on transient boot/timeout errors up to 3 times with backoff.
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
        return invokeWithRetry(body, attempt + 1);
      }
      return null;
    }
    return data as never;
  } catch {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
      return invokeWithRetry(body, attempt + 1);
    }
    return null;
  }
}

function callTranslate(
  listingId: string,
  sourceLang: Lang,
  fields: { title?: string; description?: string },
): Promise<Record<string, { title?: string; description?: string }> | null> {
  const dedupeKey = `${listingId}:${sourceLang}:${fields.title ?? ""}|${fields.description ?? ""}`;
  const existing = inflight.get(dedupeKey);
  if (existing) return existing;
  const p = (async () => {
    try {
      const data = await invokeWithRetry({ sourceLang, fields });
      if (!data) return null;
      const out: Record<string, { title?: string; description?: string }> = {};
      const titleMap = (data.titleTranslations ?? {}) as Record<string, string>;
      const descMap = (data.descriptionTranslations ?? {}) as Record<string, string>;
      const langs = new Set<string>([...Object.keys(titleMap), ...Object.keys(descMap)]);
      for (const l of langs) {
        out[l] = { title: titleMap[l], description: descMap[l] };
      }
      // Persist every returned language for both fields.
      for (const [l, vals] of Object.entries(out)) {
        if (vals.title) cacheSet("title", listingId, l, vals.title);
        if (vals.description) cacheSet("description", listingId, l, vals.description);
      }
      return out;
    } catch {
      return null;
    } finally {
      setTimeout(() => inflight.delete(dedupeKey), 0);
    }
  })();
  inflight.set(dedupeKey, p);
  return p;
}

function pickSourceLang(opts: {
  source: string;
  existing?: Record<string, string | undefined>;
}): Lang {
  if (opts.existing) {
    for (const l of LANGS) {
      if (opts.existing[l] && opts.existing[l]!.trim()) return l;
    }
  }
  return detectSourceLang(opts.source);
}

function useAutoTranslatedField(opts: {
  field: Field;
  listingId: string;
  targetLang: string;
  source: string;
  existing?: Record<string, string | undefined>;
  companion?: { field: Field; source: string; existing?: Record<string, string | undefined> };
}): { text: string; loading: boolean } {
  const { field, listingId, targetLang, source, existing, companion } = opts;
  const direct = existing?.[targetLang];

  const initial = (() => {
    if (direct && direct.trim()) return direct;
    const cached = cacheGet(field, listingId, targetLang);
    if (cached) return cached;
    return source;
  })();
  const [text, setText] = useState<string>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (direct && direct.trim()) { setText(direct); return; }
    const cached = cacheGet(field, listingId, targetLang);
    if (cached) { setText(cached); return; }
    if (!source?.trim()) return;

    const sourceLang = pickSourceLang({ source, existing });
    if (sourceLang === targetLang) { setText(source); return; }

    setLoading(true);
    const fields: { title?: string; description?: string } = { [field]: source };
    if (companion?.source?.trim()) fields[companion.field] = companion.source;

    callTranslate(listingId, sourceLang, fields).then((result) => {
      if (cancelled) return;
      if (!result) { setText(source); setLoading(false); return; }
      const target = result[targetLang]?.[field];
      if (target && target.trim()) setText(target);
      else setText(source);
      setLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, listingId, targetLang, source]);

  return { text, loading };
}

export function useAutoTranslatedDescription(opts: {
  listingId: string;
  targetLang: string;
  description: string;
  existing?: Record<string, string | undefined>;
  titleSource?: string;
  titleExisting?: Record<string, string | undefined>;
}) {
  return useAutoTranslatedField({
    field: "description",
    listingId: opts.listingId,
    targetLang: opts.targetLang,
    source: opts.description,
    existing: opts.existing,
    companion: opts.titleSource
      ? { field: "title", source: opts.titleSource, existing: opts.titleExisting }
      : undefined,
  });
}

export function useAutoTranslatedTitle(opts: {
  listingId: string;
  targetLang: string;
  title: string;
  existing?: Record<string, string | undefined>;
  descriptionSource?: string;
  descriptionExisting?: Record<string, string | undefined>;
}) {
  return useAutoTranslatedField({
    field: "title",
    listingId: opts.listingId,
    targetLang: opts.targetLang,
    source: opts.title,
    existing: opts.existing,
    companion: opts.descriptionSource
      ? { field: "description", source: opts.descriptionSource, existing: opts.descriptionExisting }
      : undefined,
  });
}

// ---- Bulk prefetch ----

interface PrefetchListing {
  id: string;
  title: string;
  description: string;
  titleTranslations?: Record<string, string | undefined>;
  descriptionTranslations?: Record<string, string | undefined>;
}

/**
 * Pre-translate title + description for every listing into the target language.
 * Skips items already cached (memory or localStorage) or already present in
 * the listing's stored translations. Runs requests sequentially with a small
 * gap to be friendly to the AI gateway.
 */
export function usePrefetchTranslations(listings: PrefetchListing[], targetLang: string) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!listings?.length) return;

    let cancelled = false;

    const work = async () => {
      for (const l of listings) {
        if (cancelled) return;

        const titleHas =
          (l.titleTranslations?.[targetLang]?.trim() ?? "") !== "" ||
          cacheGet("title", l.id, targetLang) !== null;
        const descHas =
          (l.descriptionTranslations?.[targetLang]?.trim() ?? "") !== "" ||
          cacheGet("description", l.id, targetLang) !== null;

        if (titleHas && descHas) continue;
        if (!l.title?.trim() && !l.description?.trim()) continue;

        const sourceLang = pickSourceLang({
          source: l.description || l.title || "",
          existing: (l.descriptionTranslations || l.titleTranslations) as
            | Record<string, string | undefined>
            | undefined,
        });
        if (sourceLang === (targetLang as Lang)) continue;

        const fields: { title?: string; description?: string } = {};
        if (!titleHas && l.title?.trim()) fields.title = l.title;
        if (!descHas && l.description?.trim()) fields.description = l.description;
        if (!fields.title && !fields.description) continue;

        await callTranslate(l.id, sourceLang, fields);
        if (cancelled) return;
        // Small gap between requests to avoid bursting the gateway.
        await new Promise((r) => setTimeout(r, 250));
      }
    };

    // Defer slightly so initial paint isn't blocked.
    const handle = setTimeout(() => { void work(); }, 50);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // We intentionally only depend on the IDs joined + target lang to avoid
    // re-running on every reference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings.map((l) => l.id).join(","), targetLang]);
}
