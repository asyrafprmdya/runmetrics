import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppSidebar />
      <div className="md:pl-[232px]">
        <TopBar />
        <main className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>
      <MobileNav />
    </ToastProvider>
  );
}
