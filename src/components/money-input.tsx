"use client";

import { groupDigits } from "@/lib/format";
import { inputCls } from "./ui";

/** Digits-only state (string) rendered as 1.250.000 with the numeric keypad. */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  allowNegative = false,
}: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  allowNegative?: boolean;
}) {
  const neg = allowNegative && value.startsWith("-");
  const digits = value.replace(/\D/g, "");
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-label-2">Rp</span>
      <input
        inputMode={allowNegative ? "text" : "decimal"}
        autoComplete="off"
        placeholder={placeholder}
        value={(neg ? "-" : "") + groupDigits(digits)}
        onChange={(e) => {
          const raw = e.target.value;
          const d = raw.replace(/\D/g, "").slice(0, 13);
          onChange((allowNegative && raw.trim().startsWith("-") ? "-" : "") + d);
        }}
        className={`${inputCls} num pl-11 text-right`}
      />
    </div>
  );
}

export const moneyToNumber = (s: string) => {
  const n = Number(s.replace(/\D/g, "")) || 0;
  return s.startsWith("-") ? -n : n;
};
