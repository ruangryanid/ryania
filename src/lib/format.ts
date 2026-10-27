export function formatMoney(value: number, currency = "IDR") {
  const digits = currency === "IDR" ? 0 : 2;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
    .format(value)
    .replace(/ /g, " ");
}

/** 1.250.000 -> "1,25 jt" — for tight spaces. */
export function formatCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000)} M`;
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)} jt`;
  if (abs >= 1_000) return `${trim(value / 1_000)} rb`;
  return String(Math.round(value));
}
const trim = (n: number) => n.toFixed(1).replace(".", ",").replace(/,0$/, "");

/** Digits-only string -> "45.000" for the amount field. */
export function groupDigits(digits: string) {
  const clean = digits.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
export const digitsToNumber = (s: string) => Number(s.replace(/\D/g, "")) || 0;

export function toISODate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function monthRange(anchor: Date) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export const shiftMonth = (d: Date, delta: number) =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1);

export const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);

export function dayLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const diff = Math.round(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - d.getTime()) / 86_400_000,
  );
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long" }).format(d);
}

export const budgetPercent = (spent: number, budget: number) =>
  budget > 0 ? (spent / budget) * 100 : 0;

/** Hijau <= 75, Kuning 76-99, Merah >= 100 (PRD 4.4) */
export function budgetTone(pct: number): "ok" | "warn" | "danger" {
  if (pct >= 100) return "danger";
  if (pct > 75) return "warn";
  return "ok";
}
