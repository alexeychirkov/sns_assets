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

export function shortenId(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

/** Format elapsed milliseconds into a human-readable age string (Russian) */
export function formatAge(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return "только что";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} д назад`;
}
