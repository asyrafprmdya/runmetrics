"use client";

import { HardDrive, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsClient } from "@/lib/storage/useAppState";
import { titleFor } from "./nav";

function localDateLabel(): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export function TopBar() {
  const pathname = usePathname();
  const isClient = useIsClient();
  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line px-4 sm:px-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <p className="truncate text-sm font-medium text-ink">{titleFor(pathname)}</p>
        <p className="hidden text-xs text-muted sm:block" suppressHydrationWarning>
          {isClient ? localDateLabel() : ""}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <HardDrive size={14} aria-hidden="true" />
          <span className="hidden sm:inline">Tersimpan lokal di browser</span>
          <span className="sm:hidden">Lokal</span>
        </p>
        <Link
          href="/settings"
          aria-label="Buka pengaturan"
          className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-ink md:flex"
        >
          <Settings size={18} aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
