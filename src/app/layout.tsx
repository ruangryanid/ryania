import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/register-sw";

export const metadata: Metadata = {
  title: { default: "Family Ledger", template: "%s · Family Ledger" },
  description: "Catat dan pantau keuangan keluarga bersama, real-time.",
  applicationName: "Family Ledger",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Ledger", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
