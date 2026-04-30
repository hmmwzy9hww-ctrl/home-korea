import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LANGS = ["mn", "ko", "en", "ru", "zh", "vi"] as const;
type Lang = (typeof LANGS)[number];

type Field = "title" | "description";
const memCache = new Map<string, string>(); // key: `${field}:${id}:${lang}`

function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

function detectSourceLang(text: string): Lang {
  if (/[\u0400-\u04FF]/.test(text)) return "mn"; // Cyrillic → assume Mongolian
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  return "en";
}

// In-flight request dedupe so multiple cards don't fire the same translation.
const inflight = new Map<string, Promise<Record<string, { title?: string; description?: string }> | null>>();

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
      const { data, error } = await supabase.functions.invoke("translate-listing", {
        body: { sourceLang, fields },
      });
      if (error || !data) return null;
      const out: Record<string, { title?: string; description?: string }> = {};
      const titleMap = (data.titleTranslations ?? {}) as Record<string, string>;
      const descMap = (data.descriptionTranslations ?? {}) as Record<string, string>;
      const langs = new Set<string>([...Object.keys(titleMap), ...Object.keys(descMap)]);
      for (const l of langs) {
        out[l] = { title: titleMap[l], description: descMap[l] };
      }
      return out;
    } catch {
      return null;
    } finally {
      // Allow re-fetch later if needed
      setTimeout(() => inflight.delete(dedupeKey), 0);
    }
  })();
  inflight.set(dedupeKey, p);
  return p;
}

function useAutoTranslatedField(opts: {
  field: Field;
  listingId: string;
  targetLang: string;
  source: string;
  existing?: Record<string, string | undefined>;
  // Companion field included in the same AI call to save a round trip
  companion?: { field: Field; source: string; existing?: Record<string, string | undefined> };
}): { text: string; loading: boolean } {
  const { field, listingId, targetLang, source, existing, companion } = opts;
  const direct = existing?.[targetLang];
  const cacheKey = `tr:${field}:${listingId}:${targetLang}`;

  const initial = (() => {
    if (direct && direct.trim()) return direct;
    const mem = memCache.get(`${field}:${listingId}:${targetLang}`);
    if (mem) return mem;
    const ss = ssGet(cacheKey);
    if (ss) return ss;
    return source;
  })();
  const [text, setText] = useState<string>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (direct && direct.trim()) { setText(direct); return; }
    const mem = memCache.get(`${field}:${listingId}:${targetLang}`);
    if (mem) { setText(mem); return; }
    const ss = ssGet(cacheKey);
    if (ss) { setText(ss); return; }
    if (!source?.trim()) return;

    // Detect source language: prefer first available existing translation
    let sourceLang: Lang = detectSourceLang(source);
    if (existing) {
      for (const l of LANGS) {
        if (existing[l] && existing[l]!.trim()) { sourceLang = l; break; }
      }
    }
    if (sourceLang === targetLang) { setText(source); return; }

    setLoading(true);
    const fields: { title?: string; description?: string } = { [field]: source };
    if (companion?.source?.trim()) fields[companion.field] = companion.source;

    callTranslate(listingId, sourceLang, fields).then((result) => {
      if (cancelled) return;
      if (!result) { setText(source); setLoading(false); return; }
      // Cache all returned languages for both fields
      for (const [l, vals] of Object.entries(result)) {
        if (vals.title) {
          memCache.set(`title:${listingId}:${l}`, vals.title);
          ssSet(`tr:title:${listingId}:${l}`, vals.title);
        }
        if (vals.description) {
          memCache.set(`description:${listingId}:${l}`, vals.description);
          ssSet(`tr:description:${listingId}:${l}`, vals.description);
        }
      }
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

