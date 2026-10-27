"use client";

import { useEffect } from "react";
import { AppProvider, useApp } from "@/components/app-provider";
import { TabBar } from "@/components/tab-bar";
import { TxSheet } from "@/components/tx-sheet";
import { Skeleton, ToastProvider } from "@/components/ui";

function Shell({ children }: { children: React.ReactNode }) {
  const { ready, openAdd } = useApp();

  // PWA shortcut: /?add=1 opens the quick-add sheet
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") === "1") {
      url.searchParams.delete("add");
      window.history.replaceState(null, "", url.pathname + url.search);
      openAdd();
    }
  }, [ready, openAdd]);

  return (
    <>
      <main
        className="mx-auto w-full max-w-[520px] px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
        }}
      >
        {ready ? (
          children
        ) : (
          <div className="space-y-4 pt-6" aria-busy>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-40 w-full !rounded-[20px]" />
            <Skeleton className="h-24 w-full !rounded-[20px]" />
            <Skeleton className="h-24 w-full !rounded-[20px]" />
          </div>
        )}
      </main>
      <TabBar />
      {ready && <TxSheet />}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppProvider>
        <Shell>{children}</Shell>
      </AppProvider>
    </ToastProvider>
  );
}
