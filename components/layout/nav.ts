import { Flag, Gauge, LayoutDashboard, Route, Settings, Timer, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  title: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", title: "Running Overview", icon: LayoutDashboard },
  { href: "/calculator", label: "Pace Calculator", title: "Pace Calculator", icon: Gauge },
  { href: "/interval", label: "Interval Planner", title: "Interval Planner", icon: Timer },
  { href: "/race-predictor", label: "Race Predictor", title: "Race Predictor", icon: Flag },
  { href: "/split-planner", label: "Split Planner", title: "Split Planner", icon: Route },
];

export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Settings",
  title: "Settings",
  icon: Settings,
};

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  const all = [...NAV_ITEMS, SETTINGS_ITEM];
  return all.find((item) => isActive(pathname, item.href))?.title ?? "RunMetrics";
}
