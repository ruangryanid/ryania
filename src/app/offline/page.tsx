import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-8 text-center">
      <div>
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-surface-2 text-3xl" aria-hidden>
          ☁️
        </div>
        <h1 className="t-title">Kamu sedang offline</h1>
        <p className="t-body mx-auto mt-2 max-w-[28ch] text-label-2">
          Data keuangan selalu diambil langsung dari server. Sambungkan internet lalu coba lagi.
        </p>
        <a
          href="/"
          className="press mt-6 inline-flex h-[50px] items-center rounded-[14px] bg-accent px-6 text-[1.0625rem] font-semibold text-white"
        >
          Coba lagi
        </a>
      </div>
    </main>
  );
}
