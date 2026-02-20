export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString();
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0) return "—";
  const years = s / (365 * 86400);
  if (years >= 1) return `${years.toFixed(1)}y`;
  const days = Math.floor(s / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(s / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.floor(s / 60)}m`;
}

export function shortenId(hex: string): string {
  if (hex.length <= 12) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-6)}`;
}
