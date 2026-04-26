import { Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function TopBar({ showSearch = true }: { showSearch?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/listings", search: { q: q || undefined } as never });
  };

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-1.5 shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold">
            Г
          </div>
          <span className="font-bold text-sm hidden sm:inline">{t("brand")}</span>
        </Link>
        {showSearch && (
          <form onSubmit={submit} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="text"
              placeholder={t("search.placeholder")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-full bg-secondary border-0 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
        )}
        <LanguageSwitcher compact />
      </div>
    </header>
  );
}
