import { Principal } from "@dfinity/principal";
import { getAgent } from "./agent";
import { fetchFromCanister } from "./canister";
import { fetchNeurons, fetchNervousSystemParameters } from "./governance";
import { fetchTokenBalance } from "./ledger";

import type {
  FetchOptions,
  NeuronCumulative,
  NervousSystemParamsInfo,
  ScanOptions,
  ScanProjectError,
  ScanResult,
  SnsNeuronInfo,
  SnsProject,
  SnsProjectAssets,
} from "./types";

// ─── Public type exports ───────────────────────────────────────────────────

export type {
  FetchOptions,
  FetchPhase,
  FetchProgress,
  NeuronBalance,
  NeuronCumulative,
  NervousSystemParamsInfo,
  NeuronPermission,
  NeuronState,
  NeuronValuation,
  ProjectBalance,
  ProjectValuation,
  ScanOptions,
  ScanPhase,
  ScanProgress,
  ScanProjectError,
  ScanResult,
  SnsNeuronInfo,
  SnsProject,
  SnsProjectAssets,
  TokenPrices,
} from "./types";

export { EXCLUDED_PROJECTS } from "./constants";
export { getSnapshotProjects, SNS_SNAPSHOT, SNS_SNAPSHOT_FETCHED_AT } from "./snapshot";
export { getNeuronPermissionName, NeuronPermissionType } from "./types";

// ─── Pricing & Valuation ───────────────────────────────────────────────────

export { fetchPriceMap, ICP_LEDGER_ID } from "./prices";
export type { IcpSwapTokenInfo, PriceMap } from "./prices";
export { applyValuation } from "./valuation";

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_HOST = "https://icp0.io";
const DEFAULT_CONCURRENCY = 5;

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeCumulative(neurons: SnsNeuronInfo[]): {
  neuronsTotal: NeuronCumulative;
  neuronsOwner: NeuronCumulative;
} {
  const sum = (arr: SnsNeuronInfo[]): NeuronCumulative => ({
    stakeE8s: arr.reduce((a, n) => a + n.balance.stakeE8s, 0n),
    maturityE8s: arr.reduce((a, n) => a + n.balance.maturityE8s, 0n),
    stakedMaturityE8s: arr.reduce((a, n) => a + n.balance.stakedMaturityE8s, 0n),
    totalMaturityE8s: arr.reduce((a, n) => a + n.balance.totalMaturityE8s, 0n),
  });
  return {
    neuronsTotal: sum(neurons),
    neuronsOwner: sum(neurons.filter((n) => n.isSoleOwner)),
  };
}

// ─── Utilities ─────────────────────────────────────────────────────────────

// ─── Phase 1: Fetch SNS project list ──────────────────────────────────────

/**
 * Fetch the list of all deployed SNS projects, including ICRC-1 token metadata.
 *
 * The returned `SnsProject[]` is **fully JSON-serializable** — persist it
 * however you like and pass it directly to `scanPrincipal` later:
 *
 * ```ts
 * // Fetch once
 * const projects = await fetchSnsProjects();
 * localStorage.setItem("sns", JSON.stringify(projects));
 *
 * // Restore later (no network call)
 * const projects = JSON.parse(localStorage.getItem("sns")!) as SnsProject[];
 * ```
 *
 * @param options.host       IC gateway host. Default: `"https://icp0.io"`
 * @param options.onProgress Called after each batch of metadata is fetched
 */
export async function fetchSnsProjects(options: FetchOptions = {}): Promise<SnsProject[]> {
  const { host = DEFAULT_HOST, onProgress, knownProjects, excludedProjects } = options;
  const agent = await getAgent(host);
  return fetchFromCanister(agent, { onProgress, knownProjects, excludedProjects });
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
): Promise<ScanResult> {
  const {
    host = DEFAULT_HOST,
    concurrency = DEFAULT_CONCURRENCY,
    onProgress,
    includeEmpty = false,
  } = options;

  console.log(
    `SNS: Scanning principal ${principal.toText()} across ${projects.length} SNS projects with concurrency ${concurrency}...`
  );

  const total = projects.length;
  let scanned = 0;

  const agent = await getAgent(host);
  const assets: SnsProjectAssets[] = [];
  const failed: ScanProjectError[] = [];
  const queue = [...projects];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const project = queue.shift()!;

      let neurons: SnsNeuronInfo[] = [];
      let tokenBalance = BigInt(0);
      let nervousSystemParams: NervousSystemParamsInfo | undefined;
      let governanceFailed = false;
      let ledgerFailed = false;
      let errorMsg = "";

      const [neuronsResult, balanceResult, paramsResult] = await Promise.allSettled([
        fetchNeurons(project.governanceCanisterId, principal, agent),
        fetchTokenBalance(project.ledgerCanisterId, principal, agent),
        fetchNervousSystemParameters(project.governanceCanisterId, agent),
      ]);

      if (neuronsResult.status === "fulfilled") {
        neurons = neuronsResult.value;
      } else {
        governanceFailed = true;
        errorMsg =
          neuronsResult.reason instanceof Error
            ? neuronsResult.reason.message
            : String(neuronsResult.reason);
      }

      if (balanceResult.status === "fulfilled") {
        tokenBalance = balanceResult.value;
      } else {
        ledgerFailed = true;
        if (!errorMsg) {
          errorMsg =
            balanceResult.reason instanceof Error
              ? balanceResult.reason.message
              : String(balanceResult.reason);
        }
      }

      if (paramsResult.status === "fulfilled") {
        nervousSystemParams = paramsResult.value;
      }

      if (governanceFailed || ledgerFailed) {
        failed.push({ project, governanceFailed, ledgerFailed, error: errorMsg });
      }

      const hasAssets = neurons.length > 0 || tokenBalance > BigInt(0);
      if (includeEmpty || hasAssets) {
        const { neuronsTotal, neuronsOwner } = computeCumulative(neurons);
        const totalValue = tokenBalance + neuronsOwner.stakeE8s + neuronsOwner.totalMaturityE8s;
        assets.push({
          project,
          neurons,
          hasAssets,
          balance: { tokenBalance, neuronsTotal, neuronsOwner, totalValue },
          nervousSystemParams,
        });
      }

      scanned++;
      onProgress?.({ phase: "scanning", total, scanned, current: project.name });
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, projects.length) }, worker));
  onProgress?.({ phase: "done", total, scanned });

  console.log(`SNS: Scan complete: ${assets.length} assets found, ${failed.length} failures.`);

  return { assets, failed };
}

// ─── Convenience: both phases in one call ─────────────────────────────────

/**
 * Convenience wrapper that fetches the SNS list and scans a principal in one
 * call. Useful for one-off scripts where multiple principals are not needed.
 */
export async function scanSnsAssets(
  principal: Principal,
  options: FetchOptions & ScanOptions = {}
): Promise<ScanResult> {
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
