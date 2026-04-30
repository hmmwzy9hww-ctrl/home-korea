import { useI18n } from "@/lib/i18n";
import { LISTING_OPTIONS } from "@/lib/listingOptions";
import { cn } from "@/lib/utils";

export function OptionsGrid({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { lang } = useI18n();
  const set = new Set(selected);

  const toggle = (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {LISTING_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = set.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            aria-pressed={active}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-foreground hover:bg-secondary",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                active ? "text-primary" : "text-muted-foreground",
              )}
              strokeWidth={active ? 2.25 : 1.75}
            />
            <span className="text-[11px] font-medium leading-tight">
              {opt.labels[lang]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
