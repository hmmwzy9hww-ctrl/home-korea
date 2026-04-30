import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LANGS = ["mn", "ko", "en", "ru", "zh", "vi"] as const;
type Lang = (typeof LANGS)[number];

type CacheEntry = { description?: string };
const memCache = new Map<string, CacheEntry>(); // key: `${id}:${lang}`

function ssGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

function detectSourceLang(text: string): Lang {
  if (/[\u04A0-\u04FF\u0400-\u04FF]/.test(text)) return "mn"; // Cyrillic
  if (/[\uAC00-\uD7AF]/.test(text)) return "ko";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  if (/[\u0E00-\u0E7F]/.test(text)) return "en"; // not vi-specific
  return "en";
}

/**
 * If the listing already has descriptionTranslations[targetLang], return that.
 * Otherwise call the translate-listing edge function and cache the result.
 */
export function useAutoTranslatedDescription(opts: {
  listingId: string;
  targetLang: string;
  description: string;
  existing?: Record<string, string | undefined>;
}): { text: string; loading: boolean } {
  const { listingId, targetLang, description, existing } = opts;
  const direct = existing?.[targetLang];
  const cacheKey = `tr:desc:${listingId}:${targetLang}`;

  const [text, setText] = useState<string>(() => {
    if (direct && direct.trim()) return direct;
    const mem = memCache.get(`${listingId}:${targetLang}`);
    if (mem?.description) return mem.description;
    const ss = ssGet(cacheKey);
    if (ss) return ss;
    return description;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (direct && direct.trim()) {
      setText(direct);
      return;
    }
    const mem = memCache.get(`${listingId}:${targetLang}`);
    if (mem?.description) {
      setText(mem.description);
      return;
    }
    const ss = ssGet(cacheKey);
    if (ss) {
      setText(ss);
      return;
    }
    if (!description?.trim()) return;
    // Detect source from first existing translation, else from text content.
    let sourceLang: Lang = detectSourceLang(description);
    if (existing) {
      for (const l of LANGS) {
        if (existing[l] && existing[l]!.trim()) { sourceLang = l; break; }
      }
    }
    if (sourceLang === targetLang) {
      setText(description);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("translate-listing", {
          body: { sourceLang, fields: { description } },
        });
        if (cancelled) return;
        if (error) {
          setText(description);
          return;
        }
        const translated: string | undefined = data?.descriptionTranslations?.[targetLang];
        if (translated && translated.trim()) {
          memCache.set(`${listingId}:${targetLang}`, { description: translated });
          ssSet(cacheKey, translated);
          setText(translated);
        } else {
          setText(description);
        }
      } catch {
        if (!cancelled) setText(description);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, targetLang, description]);

  return { text, loading };
}
