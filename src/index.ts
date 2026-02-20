import { Principal } from "@dfinity/principal";
import { fetchAllSnsProjects } from "./aggregator.js";
import { getAgent } from "./agent.js";
import { fetchNeurons } from "./governance.js";
import { fetchTokenBalance } from "./ledger.js";
import type { ScanOptions, ScanProgress, SnsProject, SnsProjectAssets } from "./types.js";

export type {
  ScanOptions,
  ScanProgress,
  SnsProject,
  SnsProjectAssets,
  SnsNeuronInfo,
  NeuronState,
  SnsCanisterIds,
  SnsMeta,
} from "./types.js";

const DEFAULT_HOST = "https://ic0.app";
const DEFAULT_CONCURRENCY = 5;

/**
 * Scan all running SNS projects and return neurons + token balances
 * for the given principal.
 *
 * @param principal - The @dfinity/Principal to scan for
 * @param options   - Optional configuration (host, concurrency, progress callback)
 * @returns Array of per-SNS results (only projects with assets by default)
 *
 * @example
 * ```ts
 * import { scanSnsAssets } from "sns-assets";
 * import { Principal } from "@dfinity/principal";
 *
 * const results = await scanSnsAssets(
 *   Principal.fromText("aaaaa-aa"),
 *   {
 *     onProgress: (p) => console.log(`${p.scanned}/${p.total} scanned`),
 *   }
 * );
 * ```
 */
export async function scanSnsAssets(
  principal: Principal,
  options: ScanOptions = {}
): Promise<SnsProjectAssets[]> {
  const {
    host = DEFAULT_HOST,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    includeEmpty = false,
  } = options;

  const report = (progress: Partial<ScanProgress> & { phase: ScanProgress["phase"] }) => {
    onProgress?.({
      total: 0,
      scanned: 0,
      ...progress,
    });
  };

  // 1. Fetch the SNS list ─────────────────────────────────────────────────
  report({ phase: "fetching-sns-list" });

  let projects: SnsProject[];
  try {
    projects = await fetchAllSnsProjects();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    report({ phase: "error", error: msg });
    throw err;
  }

  const total = projects.length;
  let scanned = 0;

  report({ phase: "scanning", total, scanned });

  // 2. Shared agent for all queries ──────────────────────────────────────
  const agent = await getAgent(host);

  // 3. Scan with bounded concurrency ────────────────────────────────────
  const results: SnsProjectAssets[] = [];
  const queue = [...projects];

  async function scanOne(project: SnsProject): Promise<SnsProjectAssets | null> {
    const [neurons, tokenBalance] = await Promise.all([
      fetchNeurons(project.governanceCanisterId, principal, agent).catch(() => []),
      fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(() => 0n),
    ]);

    const hasAssets = neurons.length > 0 || tokenBalance > 0n;

    return {
      project,
      neurons,
      tokenBalance,
      hasAssets,
    };
  }

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const project = queue.shift()!;

      report({ phase: "scanning", total, scanned, current: project.name });

      try {
        const result = await scanOne(project);
        if (result && (includeEmpty || result.hasAssets)) {
          results.push(result);
        }
      } catch {
        // individual project errors are already swallowed in scanOne
      }

      scanned++;
      report({ phase: "scanning", total, scanned, current: project.name });
    }
  }

  // Run `concurrency` workers in parallel
  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, () => worker()));

  report({ phase: "done", total, scanned });

  return results;
}

/**
 * Async generator variant — yields each SNS result as it completes,
 * which is useful for streaming progress to a UI.
 *
 * @example
 * ```ts
 * for await (const item of streamSnsAssets(principal)) {
 *   console.log(item.project.name, item.neurons.length, item.tokenBalance);
 * }
 * ```
 */
export async function* streamSnsAssets(
  principal: Principal,
  options: Omit<ScanOptions, "onProgress"> = {}
): AsyncGenerator<SnsProjectAssets> {
  const { host = DEFAULT_HOST, concurrency = DEFAULT_CONCURRENCY } = options;

  const projects = await fetchAllSnsProjects();
  const agent = await getAgent(host);

  const queue = [...projects];

  // Use a channel-like approach with a results buffer
  const buffer: SnsProjectAssets[] = [];
  let done = false;
  let pending = 0;
  let resolveNext: (() => void) | undefined;

  function notify() {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = undefined;
      r();
    }
  }

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const project = queue.shift()!;
      pending++;

      const [neurons, tokenBalance] = await Promise.all([
        fetchNeurons(project.governanceCanisterId, principal, agent).catch(() => []),
        fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(() => 0n),
      ]);

      const hasAssets = neurons.length > 0 || tokenBalance > 0n;
      buffer.push({ project, neurons, tokenBalance, hasAssets });
      pending--;
      notify();
    }
  }

  // Kick off workers
  const workerPromises = Array.from({ length: Math.min(concurrency, projects.length) }, () =>
    worker()
  );

  Promise.all(workerPromises).then(() => {
    done = true;
    notify();
  });

  // Yield results as they arrive
  while (!done || buffer.length > 0 || pending > 0) {
    if (buffer.length > 0) {
      yield buffer.shift()!;
    } else {
      await new Promise<void>((r) => {
        resolveNext = r;
      });
    }
  }

  // Drain any remaining buffered results
  while (buffer.length > 0) {
    yield buffer.shift()!;
  }
}

/**
 * Utility: format a token amount from smallest units to human-readable string.
 *
 * @example
 * ```ts
 * formatTokenAmount(123456789n, 8) // => "1.23456789"
 * ```
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
 * Utility: format dissolve delay seconds into a human-readable string.
 *
 * @example
 * ```ts
 * formatDuration(15897600n) // => "184 days"
 * ```
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
