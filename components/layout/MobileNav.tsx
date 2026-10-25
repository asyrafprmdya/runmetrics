"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SETTINGS_ITEM, isActive } from "./nav";

const SHORT_LABELS: Record<string, string> = {
  "/": "Home",
  "/calculator": "Pace",
  "/interval": "Interval",
  "/race-predictor": "Race",
  "/split-planner": "Split",
  "/settings": "Settings",
};

export function MobileNav() {
  const pathname = usePathname();
  const items = [...NAV_ITEMS, SETTINGS_ITEM];
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-line bg-bg md:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{SHORT_LABELS[item.href]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
