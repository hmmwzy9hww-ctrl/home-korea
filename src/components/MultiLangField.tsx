import { useState } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import type { Translations } from "@/lib/types";

interface Props {
  baseLabel: string;
  baseValue: string;
  onBaseChange: (v: string) => void;
  translations: Translations | undefined;
  onTranslationsChange: (next: Translations) => void;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  baseLang?: Lang; // language the base value represents (default: ko)
}

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

export function MultiLangField({
  baseLabel,
  baseValue,
  onBaseChange,
  translations,
  onTranslationsChange,
  placeholder,
  textarea,
  rows = 4,
  baseLang = "ko",
}: Props) {
  const [active, setActive] = useState<Lang>(baseLang);
  const tr = translations || {};

  const value = active === baseLang ? baseValue : tr[active] ?? "";
  const setValue = (v: string) => {
    if (active === baseLang) {
      onBaseChange(v);
    } else {
      const next = { ...tr, [active]: v };
      onTranslationsChange(next);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {baseLabel}
      </label>
      <div className="flex flex-wrap gap-1 mb-2">
        {LANGS.map((l) => {
          const filled =
            l.code === baseLang ? !!baseValue.trim() : !!(tr[l.code] || "").trim();
          const isActive = active === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setActive(l.code)}
              className={[
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary hover:bg-secondary/70 border-transparent",
              ].join(" ")}
              title={l.label}
            >
              <span>{l.flag}</span>
              <span className="hidden sm:inline">{l.label}</span>
              {l.code === baseLang ? (
                <span className="opacity-60">·src</span>
              ) : filled ? (
                <span className="text-emerald-500">●</span>
              ) : (
                <span className="opacity-40">○</span>
              )}
            </button>
          );
        })}
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={inputCls}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
      {active !== baseLang && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {baseLang.toUpperCase()}: {baseValue || "—"}
        </p>
      )}
    </div>
  );
}
