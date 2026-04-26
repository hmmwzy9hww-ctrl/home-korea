import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  showSearch?: boolean;
}

export function AppShell({ children, showSearch = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar showSearch={showSearch} />
      <main className="flex-1 pb-20">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
