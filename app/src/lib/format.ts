import { secondsToDuration, type I18nSecondsToDuration } from "@dfinity/utils";

export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString();
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

const i18nSecondsToDurationShort: I18nSecondsToDuration = {
  year: "y",
  year_plural: "y",
  month: "mo",
  month_plural: "mo",
  day: "d",
  day_plural: "d",
  hour: "h",
  hour_plural: "h",
  minute: "m",
  minute_plural: "m",
  second: "s",
  second_plural: "s",
};

export function formatDuration(seconds: bigint): string {
  if (seconds <= 0n) return "—";
  return secondsToDuration({ seconds, i18n: i18nSecondsToDurationShort });
}

export function formatDays(seconds: bigint): string {
  if (seconds <= 0n) return "—";
  const days = Math.floor(Number(seconds) / 86400);
  return `${days} d`;
}

export function shortenId(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

/**
 * Format USD e6s (1 USD = 1_000_000n) as "$12.34".
 * Negative values are rendered as "-$12.34".
 */
export function formatUsdE6s(e6s: bigint): string {
  const neg = e6s < 0n;
  const abs = neg ? -e6s : e6s;
  const whole = abs / 1_000_000n;
  const frac = ((abs % 1_000_000n) / 10_000n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${whole}.${frac}`;
}

/** Format ICP e8s (bigint) as "1.23 ICP" */
export function formatIcpE8s(e8s: bigint): string {
  return formatTokenAmount(e8s, 8) + " ICP";
}

/** Format elapsed milliseconds into a human-readable age string */
export function formatAge(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} d ago`;
}
