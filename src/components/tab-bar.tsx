"use client";

import { LayoutDashboard, ListOrdered, PieChart, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptics";
import { useApp } from "./app-provider";

const TABS = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: ListOrdered },
  null,
  { href: "/budget", label: "Anggaran", icon: PieChart },
  { href: "/accounts", label: "Dompet", icon: Wallet },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const { openAdd } = useApp();

  return (
    <nav
      className="material fixed inset-x-0 bottom-0 z-40"
      style={{ boxShadow: "0 -0.5px 0 var(--sep)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navigasi utama"
    >
      <ul className="mx-auto grid h-[58px] max-w-[520px] grid-cols-5 items-center">
        {TABS.map((tab, i) => {
          if (!tab) {
            return (
              <li key="add" className="grid place-items-center">
                <button
                  onClick={() => {
                    haptic("tap");
                    openAdd();
                  }}
                  aria-label="Catat transaksi"
                  className="press grid h-12 w-12 place-items-center rounded-full bg-accent text-white"
                  style={{ boxShadow: "0 4px 14px color-mix(in srgb, var(--accent) 45%, transparent)" }}
                >
                  <Plus size={26} strokeWidth={2.6} />
                </button>
              </li>
            );
          }
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="press flex h-[58px] flex-col items-center justify-center gap-0.5"
                style={{ color: active ? "var(--accent)" : "var(--label-2)" }}
              >
                <Icon size={23} strokeWidth={active ? 2.4 : 1.9} />
                <span className="text-[0.625rem] font-medium tracking-[0.01em]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
