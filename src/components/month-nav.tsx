"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { monthLabel, shiftMonth } from "@/lib/format";

export function MonthNav({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const now = new Date();
  const atCurrent = value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
  const step = (n: number) => {
    haptic("tap");
    onChange(shiftMonth(value, n));
  };
  return (
    <div className="mt-3 flex items-center justify-between rounded-[14px] bg-surface p-1" style={{ boxShadow: "var(--shadow)" }}>
      <button onClick={() => step(-1)} aria-label="Bulan sebelumnya" className="press grid h-10 w-10 place-items-center rounded-[11px] text-accent">
        <ChevronLeft size={22} strokeWidth={2.4} />
      </button>
      <span className="t-headline capitalize">{monthLabel(value)}</span>
      <button
        onClick={() => step(1)}
        disabled={atCurrent}
        aria-label="Bulan berikutnya"
        className="press grid h-10 w-10 place-items-center rounded-[11px] text-accent disabled:opacity-30"
      >
        <ChevronRight size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
}
