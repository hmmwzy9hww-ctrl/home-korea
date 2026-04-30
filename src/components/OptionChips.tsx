import { useI18n } from "@/lib/i18n";
import { resolveOption } from "@/lib/listingOptions";
import { cn } from "@/lib/utils";

export function OptionChips({
  options,
  size = "md",
  className,
}: {
  options: string[];
  size?: "sm" | "md";
  className?: string;
}) {
  const { lang } = useI18n();
  if (!options?.length) return null;

  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const iconCls = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((value) => {
        const opt = resolveOption(value);
        const label = opt ? opt.labels[lang] : value;
        const Icon = opt?.icon;
        return (
          <span
            key={value}
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary font-medium",
              padding,
            )}
          >
            {Icon && <Icon className={iconCls} strokeWidth={2} />}
            {label}
          </span>
        );
      })}
    </div>
  );
}
