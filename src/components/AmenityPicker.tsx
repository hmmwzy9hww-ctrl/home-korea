import { useAmenities, amenityName } from "@/lib/store";
import { AmenityIcon } from "@/components/AmenityIcon";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Multi-select grid of amenities. Each item is an icon + label tile that
 * toggles its id in `value` when clicked.
 */
export function AmenityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { lang } = useI18n();
  const amenities = useAmenities();
  const selected = new Set(value);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Preserve sort_order from amenities list
    const ordered = amenities.filter((a) => next.has(a.id)).map((a) => a.id);
    onChange(ordered);
  };

  if (amenities.length === 0) {
    return <p className="text-xs text-muted-foreground">—</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {amenities.map((a) => {
        const isOn = selected.has(a.id);
        const label = amenityName(a, lang);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => toggle(a.id)}
            aria-pressed={isOn}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[11px] font-medium transition-colors",
              isOn
                ? "bg-primary/10 border-primary text-primary"
                : "bg-card hover:bg-secondary border-border text-foreground",
            )}
          >
            <AmenityIcon iconUrl={a.icon_url} iconName={a.icon} className="h-5 w-5" alt={label} />
            <span className="text-center leading-tight line-clamp-2">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
