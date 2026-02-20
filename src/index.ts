import { Principal } from "@dfinity/principal";
import { getAgent } from "./agent.js";
import { fetchFromSources } from "./sources.js";
import { fetchNeurons } from "./governance.js";
import { fetchTokenBalance } from "./ledger.js";
import type { FetchOptions, ScanOptions, SnsProject, SnsProjectAssets } from "./types.js";

// ─── Public type exports ───────────────────────────────────────────────────

export type {
  FetchOptions,
  FetchProgress,
  FetchPhase,
  ScanOptions,
  ScanProgress,
  ScanPhase,
  SnsProject,
  SnsProjectAssets,
  SnsNeuronInfo,
  NeuronState,
  SnsSource,
  SourceMode,
} from "./types.js";

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_HOST = "https://ic0.app";
const DEFAULT_CONCURRENCY = 5;

// ─── Phase 1: Fetch SNS project list ──────────────────────────────────────

/**
 * Fetch the list of all deployed SNS projects.
 *
 * The returned `SnsProject[]` is **fully JSON-serializable** — persist it
 * however you like and pass it directly to `scanPrincipal` later:
 *
 * ```ts
 * // Fetch once
 * const projects = await fetchSnsProjects({ source: "both" });
 * localStorage.setItem("sns", JSON.stringify(projects));
 *
 * // Restore later (no network call)
 * const projects = JSON.parse(localStorage.getItem("sns")!) as SnsProject[];
 * ```
 *
 * @param options.source     Which source(s) to query. Default: `"both"`
 * @param options.host       IC gateway host. Default: `"https://ic0.app"`
 * @param options.onProgress Called after each page is fetched
 */
export async function fetchSnsProjects(options: FetchOptions = {}): Promise<SnsProject[]> {
  const { source = "both", host = DEFAULT_HOST, onProgress } = options;
  const agent = await getAgent(host);
  return fetchFromSources(source, agent, { onProgress });
}

// ─── Phase 2: Scan a principal against a pre-fetched list ─────────────────

/**
 * Scan a principal for neurons + token balances across a list of SNS projects.
 *
 * Pass the result of `fetchSnsProjects()` (or a JSON-restored copy) as the
 * second argument — **the SNS list is never re-fetched**.
 *
 * ```ts
 * const projects = await fetchSnsProjects();
 *
 * // Scan as many principals as needed — one network fetch total
 * const r1 = await scanPrincipal(p1, projects);
 * const r2 = await scanPrincipal(p2, projects);
 * const r3 = await scanPrincipal(p3, projects);
 * ```
 *
 * @param principal The principal to scan
 * @param projects  Pre-fetched SNS project list
 * @param options   Concurrency, progress callback, etc.
 */
export async function scanPrincipal(
  principal: Principal,
  projects: SnsProject[],
  options: ScanOptions = {}
): Promise<SnsProjectAssets[]> {
  const {
    host = DEFAULT_HOST,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    includeEmpty = false,
  } = options;

  const total = projects.length;
  let scanned = 0;

  const agent = await getAgent(host);
  const results: SnsProjectAssets[] = [];
  const queue = [...projects];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const project = queue.shift()!;

      const [neurons, tokenBalance] = await Promise.all([
        fetchNeurons(project.governanceCanisterId, principal, agent).catch(() => []),
        fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(() => 0n),
      ]);

      const hasAssets = neurons.length > 0 || tokenBalance > 0n;
      if (includeEmpty || hasAssets) {
        results.push({ project, neurons, tokenBalance, hasAssets });
      }

      scanned++;
      onProgress?.({ phase: "scanning", total, scanned, current: project.name });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, worker));
  onProgress?.({ phase: "done", total, scanned });

  return results;
}

/**
 * Async-generator variant of `scanPrincipal` — yields each result as it
 * arrives, useful for streaming updates to a UI.
 *
 * ```ts
 * const projects = await fetchSnsProjects();
 *
 * for await (const item of streamPrincipal(principal, projects)) {
 *   console.log(item.project.name, item.neurons.length, item.tokenBalance);
 * }
 * ```
 */
export async function* streamPrincipal(
  principal: Principal,
  projects: SnsProject[],
  options: Omit<ScanOptions, "onProgress"> = {}
): AsyncGenerator<SnsProjectAssets> {
  const { host = DEFAULT_HOST, concurrency = DEFAULT_CONCURRENCY } = options;

  const agent = await getAgent(host);
  const queue = [...projects];

  const buffer: SnsProjectAssets[] = [];
  let done = false;
  let resolveNext: (() => void) | undefined;

  function notify() {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = undefined;
      r();
    }
  }

  const workerPromises = Array.from(
    { length: Math.min(concurrency, projects.length) },
    async () => {
      while (queue.length > 0) {
        const project = queue.shift()!;

        const [neurons, tokenBalance] = await Promise.all([
          fetchNeurons(project.governanceCanisterId, principal, agent).catch(() => []),
          fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(() => 0n),
        ]);

        buffer.push({
          project,
          neurons,
          tokenBalance,
          hasAssets: neurons.length > 0 || tokenBalance > 0n,
        });
        notify();
      }
    }
  );

  Promise.all(workerPromises).then(() => {
    done = true;
    notify();
  });

  while (!done || buffer.length > 0) {
    if (buffer.length > 0) {
      yield buffer.shift()!;
    } else {
      await new Promise<void>((r) => {
        resolveNext = r;
      });
    }
  }

  while (buffer.length > 0) yield buffer.shift()!;
}

// ─── Convenience: both phases in one call ─────────────────────────────────

/**
 * Convenience wrapper that fetches the SNS list and scans a principal in one
 * call. Useful for one-off scripts where multiple principals are not needed.
 *
 * For scanning multiple principals, prefer `fetchSnsProjects` + `scanPrincipal`
 * to avoid re-fetching the list.
 */
export async function scanSnsAssets(
  principal: Principal,
  options: FetchOptions & ScanOptions = {}
): Promise<SnsProjectAssets[]> {
  const projects = await fetchSnsProjects(options);
  return scanPrincipal(principal, projects, options);
}

// ─── Utilities ─────────────────────────────────────────────────────────────

/**
 * Format a token amount from smallest units to a human-readable string.
 * @example formatTokenAmount(123456789n, 8) // => "1.23456789"
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  if (decimals === 0) return amount.toString();
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/**
 * Format a dissolve delay (seconds) into a human-readable string.
 * @example formatDuration(15897600n) // => "184 days"
 */
export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s === 0) return "0 seconds";
  const days = Math.floor(s / 86400);
  if (days >= 365) return `${(days / 365).toFixed(1)} years`;
  if (days >= 1) return `${days} days`;
  const hours = Math.floor(s / 3600);
  if (hours >= 1) return `${hours} hours`;
  return `${Math.floor(s / 60)} minutes`;
}
