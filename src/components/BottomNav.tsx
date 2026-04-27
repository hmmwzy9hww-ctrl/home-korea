import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useI18n();
  const loc = useLocation();
  const items = [
    { to: "/", icon: Home, label: t("nav.home") },
    { to: "/listings", icon: Search, label: t("nav.search") },
    { to: "/favorites", icon: Heart, label: t("nav.favorites") },
  ] as const;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t safe-bottom">
      <ul className="grid grid-cols-3 max-w-3xl mx-auto">
        {items.map((it) => {
          const active =
            it.to === "/"
              ? loc.pathname === "/"
              : loc.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span className={cn(active && "font-semibold")}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
