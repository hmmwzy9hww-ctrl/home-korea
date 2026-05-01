import { RefreshCw, Zap } from "lucide-react";
import { isCacheBypass, setCacheBypass, useCacheBypass, refreshListings } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Compact toggle that bypasses the local listings cache and always fetches
 * fresh data straight from Supabase. Useful for admins / power users who
 * need to see updates instantly.
 */
export function CacheBypassToggle({ className }: { className?: string }) {
  const bypass = useCacheBypass();

  const handleToggle = () => {
    setCacheBypass(!isCacheBypass());
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleToggle}
        title={
          bypass
            ? "Шууд DB-ээс татаж байна (cache идэвхгүй)"
            : "Cache идэвхтэй — товчлуурыг дараад шууд DB-ээс татах"
        }
        aria-pressed={bypass}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border",
          bypass
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-secondary text-muted-foreground border-transparent hover:text-foreground",
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{bypass ? "Live" : "Cache"}</span>
      </button>
      {bypass && (
        <button
          type="button"
          onClick={() => refreshListings()}
          title="Дахин татах"
          className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
