import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "RunMetrics",
  description: "Kalkulator metrik lari pribadi: heart rate zones, training pace, prediksi finish, dan strategi pacing.",
};

export const viewport: Viewport = {
  themeColor: "#0c0e0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="bg-bg">
      <body className="min-h-screen bg-bg text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
