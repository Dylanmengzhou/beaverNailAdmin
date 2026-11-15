import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import AdminShell from "@/components/admin/AdminShell";
import { adminSans, brandBubbles, studioHand } from "@/lib/admin-fonts";
import { Suspense } from "react";
export const metadata: Metadata = {
  title: "Beaver & Aura · 管理端",
  description: "Beaver & Aura 工作室管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fffcf5" />
        <link rel="apple-touch-icon" href="/favicon-512.png" />
      </head>
      <body className={`${adminSans.variable} ${brandBubbles.variable} ${studioHand.variable}`}>
        <Toaster richColors />
        <Suspense fallback={<div>Loading...</div>}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      </body>
    </html>
  );
}
