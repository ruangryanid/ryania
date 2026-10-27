"use client";

import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  ArrowLeftRight,
  Banknote,
  Car,
  CirclePlus,
  Clapperboard,
  CreditCard,
  Landmark,
  PiggyBank,
  Receipt,
  ShoppingBasket,
  Smartphone,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { haptic } from "@/lib/haptics";
import type { AccountType } from "@/lib/types";

/* ───────────────────────── Icons ───────────────────────── */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "shopping-basket": ShoppingBasket,
  car: Car,
  utensils: Utensils,
  receipt: Receipt,
  "credit-card": CreditCard,
  clapperboard: Clapperboard,
  "piggy-bank": PiggyBank,
  wallet: Wallet,
  "plus-circle": CirclePlus,
  transfer: ArrowLeftRight,
};
export const categoryIcon = (name?: string | null) => (name && CATEGORY_ICONS[name]) || Tag;

export const ACCOUNT_ICONS: Record<AccountType, LucideIcon> = {
  bank: Landmark,
  ewallet: Smartphone,
  cash: Banknote,
  investment: TrendingUp,
};

export function IconBadge({
  icon: Icon,
  tone = "accent",
  size = 40,
}: {
  icon: LucideIcon;
  tone?: "accent" | "income" | "expense" | "neutral";
  size?: number;
}) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    income: "bg-income/15 text-income",
    expense: "bg-expense/15 text-expense",
    neutral: "bg-surface-2 text-label-2",
  };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${tones[tone]}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={size * 0.5} strokeWidth={2.2} />
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name?: string | null; size?: number }) {
  const initials = (name ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-accent text-white font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}

/* ───────────────────────── Layout primitives ───────────────────────── */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] bg-surface ${className}`} style={{ boxShadow: "var(--shadow)" }}>
      {children}
    </div>
  );
}

export function Section({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-7">
      {(title || action) && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="t-section">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Large-title header with a translucent compact bar that materializes on scroll. */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 34);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <div
        className="material fixed inset-x-0 top-0 z-30 transition-opacity duration-200"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          opacity: scrolled ? 1 : 0,
          pointerEvents: "none",
          boxShadow: "0 0.5px 0 var(--sep)",
        }}
        aria-hidden
      >
        <div className="mx-auto grid h-11 max-w-[520px] place-items-center t-headline">{title}</div>
      </div>
      <header className="flex items-end justify-between gap-3 pb-1 pt-3">
        <div className="min-w-0">
          {subtitle && <p className="t-sub mb-0.5 capitalize">{subtitle}</p>}
          <h1 className="t-large truncate">{title}</h1>
        </div>
        {right && <div className="flex shrink-0 items-center gap-2 pb-1">{right}</div>}
      </header>
    </>
  );
}

export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <IconBadge icon={Icon} size={56} tone="neutral" />
      <p className="t-headline mt-2">{title}</p>
      {body && <p className="t-sub max-w-[26ch]">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

/* ───────────────────────── Controls ───────────────────────── */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "tinted" | "plain" | "danger";
  block?: boolean;
  small?: boolean;
};
export function Button({ variant = "primary", block, small, className = "", ...p }: BtnProps) {
  const v = {
    primary: "bg-accent text-white",
    tinted: "bg-accent-soft text-accent",
    plain: "text-accent",
    danger: "bg-danger/12 text-danger",
  }[variant];
  return (
    <button
      {...p}
      className={`press inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold disabled:opacity-40 ${
        small ? "h-9 px-3.5 text-[0.9375rem]" : "h-[50px] px-5 text-[1.0625rem]"
      } ${block ? "w-full" : ""} ${v} ${className}`}
    />
  );
}

export function IconButton({
  label,
  children,
  ...p
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...p}
      aria-label={label}
      className={`press grid h-10 w-10 place-items-center rounded-full bg-surface text-label ${p.className ?? ""}`}
      style={{ boxShadow: "var(--shadow)" }}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  id: string;
}) {
  return (
    <div className="relative flex rounded-[11px] bg-sep p-0.5" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) haptic("tap");
              onChange(o.value);
            }}
            className="relative z-10 h-8 flex-1 rounded-[9px] text-[0.8125rem] font-semibold"
            style={{ color: active ? "var(--label)" : "var(--label-2)" }}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-[9px] bg-surface"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.14)" }}
                transition={{ type: "spring", bounce: 0.12, duration: 0.35 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="t-cap mb-1 block px-1 font-medium">{label}</span>
      {children}
      {hint && <span className="t-cap mt-1 block px-1">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "h-12 w-full rounded-xl bg-surface px-4 text-[1rem] outline-none placeholder:text-label-3 focus-visible:ring-2 focus-visible:ring-accent";

export function ProgressBar({ pct, height = 8 }: { pct: number; height?: number }) {
  const tone = pct >= 100 ? "var(--danger)" : pct > 75 ? "var(--warn)" : "var(--ok)";
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-sep"
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, pct)}%`,
          background: tone,
          transition: "width 600ms var(--ease-out), background-color 300ms",
        }}
      />
    </div>
  );
}

/* ───────────────────────── Sheet ─────────────────────────
   Drag from the handle, 1:1 tracking, release projects momentum (Apple's
   decelerationRate formula) and hands the finger velocity to the spring. */

const project = (v: number, rate = 0.998) => ((v / 1000) * rate) / (1 - rate);

/** Lets a sheet's content close it with the exit animation (e.g. after saving). */
const SheetCloseCtx = createContext<() => void>(() => {});
export const useSheetClose = () => useContext(SheetCloseCtx);

export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  const y = useMotionValue(typeof window === "undefined" ? 800 : window.innerHeight);
  const scrim = useTransform(() => 1 - Math.min(1, Math.max(0, y.get() / (ref.current?.offsetHeight || 600))));
  const [fade, setFade] = useState(reduce ? 0 : 1);

  const height = () => ref.current?.offsetHeight ?? window.innerHeight;

  const close = useCallback(
    (velocity = 0) => {
      if (reduce) {
        setFade(0);
        setTimeout(onClose, 160);
        return;
      }
      animate(y, height() + 40, { type: "spring", bounce: 0, duration: 0.38, velocity }).then(onClose);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduce, onClose],
  );

  useEffect(() => {
    if (reduce) {
      y.set(0);
      requestAnimationFrame(() => setFade(1));
      return;
    }
    const c = animate(y, 0, { type: "spring", bounce: 0, duration: 0.45 });
    return () => c.stop();
  }, [reduce, y]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  return (
    <SheetCloseCtx.Provider value={() => close()}>
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        className="absolute inset-0 bg-black/40"
        style={{ opacity: reduce ? fade : scrim }}
        onPointerDown={() => close()}
      />
      <motion.div
        ref={ref}
        drag={reduce ? false : "y"}
        dragControls={controls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.03, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          const projected = y.get() + project(info.velocity.y);
          if (info.velocity.y > 600 || projected > height() * 0.55) close(info.velocity.y);
          else animate(y, 0, { type: "spring", bounce: 0.2, duration: 0.35, velocity: info.velocity.y });
        }}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[94dvh] w-full max-w-[520px] flex-col rounded-t-[28px] bg-app"
        style={{ y, boxShadow: "var(--sheet-shadow)", opacity: reduce ? fade : 1, transition: reduce ? "opacity 160ms" : undefined }}
      >
        <div
          className="ctl relative shrink-0 cursor-grab touch-none select-none"
          onPointerDown={(e) => !reduce && controls.start(e)}
        >
          <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-label-3" />
          <div className="grid h-12 grid-cols-[48px_1fr_48px] items-center">
            <span />
            <h2 className="t-headline text-center">{title}</h2>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => close()}
              aria-label="Tutup"
              className="press mr-2 grid h-8 w-8 place-items-center justify-self-end rounded-full bg-sep text-label-2"
            >
              <X size={16} strokeWidth={2.6} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
        {footer && (
          <div
            className="material shrink-0 px-4 pt-3"
            style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))", boxShadow: "0 -0.5px 0 var(--sep)" }}
          >
            {footer}
          </div>
        )}
        {!footer && <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />}
      </motion.div>
    </div>
    </SheetCloseCtx.Provider>
  );
}

/* ───────────────────────── Toast ───────────────────────── */

type ToastKind = "success" | "error" | "info";
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((msg: string, kind: ToastKind = "info") => {
    clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, kind });
    haptic(kind === "error" ? "error" : kind === "success" ? "success" : "tap");
    timer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
        aria-live="polite"
      >
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: "spring", bounce: 0, duration: 0.35 }}
              className="material pointer-events-auto max-w-full rounded-full px-4 py-2.5 text-[0.9375rem] font-medium"
              style={{
                boxShadow: "var(--shadow), 0 0 0 0.5px var(--sep)",
                color: toast.kind === "error" ? "var(--danger)" : "var(--label)",
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
