import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext, translate, type Lang } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/store";

const STORAGE_KEY = "ger.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mn");
  const settings = useSiteSettings();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && ["mn", "ko", "en", "ru", "zh", "vi"].includes(saved)) {
      setLangState(saved);
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => {
        const override = settings.textOverrides?.[lang]?.[key];
        if (override !== undefined && override !== "") {
          let value = override;
          if (vars) for (const [k, v] of Object.entries(vars)) value = value.replaceAll(`{${k}}`, String(v));
          return value;
        }
        return translate(lang, key, vars);
      },
    }),
    [lang, setLang, settings.textOverrides],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
