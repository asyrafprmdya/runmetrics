"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, SETTINGS_ITEM, isActive, type NavItem } from "./nav";

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-sm transition-colors duration-150 ${
        active
          ? "border-accent bg-elevated font-medium text-accent"
          : "border-transparent text-muted hover:bg-surface hover:text-ink"
      }`}
    >
      <Icon size={18} aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-[232px] flex-col border-r border-line bg-bg px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-2.5 px-3 text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-bg">
          <Activity size={18} aria-hidden="true" />
        </span>
        <span className="text-base font-semibold">RunMetrics</span>
      </Link>
      <nav aria-label="Navigasi utama" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
        <div className="mt-auto border-t border-line pt-3">
          <SidebarLink item={SETTINGS_ITEM} pathname={pathname} />
        </div>
      </nav>
    </aside>
  );
}
