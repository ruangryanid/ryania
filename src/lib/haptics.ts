type Pattern = "tap" | "success" | "error";

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 8,
  success: [12, 40, 12],
  error: [30, 50, 30],
};

/** Vibration API — no-op where unsupported (iOS Safari). Fire on the causal event. */
export function haptic(kind: Pattern = "tap") {
  try {
    navigator.vibrate?.(PATTERNS[kind]);
  } catch {
    /* unsupported */
  }
}
