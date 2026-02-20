import type { Principal } from "@dfinity/principal";

// ─── SNS Project ───────────────────────────────────────────────────────────

/**
 * A deployed SNS project.
 *
 * **Fully JSON-serializable** — persist and restore with:
 * ```ts
 * const serialized = JSON.stringify(projects);
 * const projects   = JSON.parse(serialized) as SnsProject[];
 * ```
 */
export interface SnsProject {
  name: string;
  governanceCanisterId: string;
  ledgerCanisterId: string;
  rootCanisterId: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

// ─── Neurons ───────────────────────────────────────────────────────────────

export type NeuronState = "locked" | "dissolving" | "dissolved";

export interface SnsNeuronInfo {
  /** Hex-encoded neuron ID */
  id: string;
  /** Staked amount in smallest token units */
  stakeE8s: bigint;
  /** Accrued maturity in smallest token units */
  maturityE8s: bigint;
  state: NeuronState;
  /** Remaining dissolve delay in seconds */
  dissolveDelaySeconds: bigint;
  /** Unix timestamp (seconds) when the neuron dissolves; only if dissolving */
  dissolveAt?: bigint;
  votingPowerPercentageMultiplier: bigint;
}

// ─── Results ───────────────────────────────────────────────────────────────

export interface SnsProjectAssets {
  project: SnsProject;
  /** Neurons owned by (or hotkeyed to) the queried principal */
  neurons: SnsNeuronInfo[];
  /** Token balance in smallest units (bigint) */
  tokenBalance: bigint;
  hasAssets: boolean;
}

// ─── Progress ──────────────────────────────────────────────────────────────

export type FetchPhase = "fetching" | "done" | "error";
export type ScanPhase = "scanning" | "done" | "error";

export interface FetchProgress {
  phase: FetchPhase;
  /** Projects collected so far */
  fetched: number;
  error?: string;
}

export interface ScanProgress {
  phase: ScanPhase;
  total: number;
  scanned: number;
  current?: string;
  error?: string;
}

// ─── Options ───────────────────────────────────────────────────────────────

export interface FetchOptions {
  /** IC HTTP gateway host. Default: "https://ic0.app" */
  host?: string;
  /** Called as pages are fetched (useful for large lists) */
  onProgress?: (progress: FetchProgress) => void;
}

export interface ScanOptions {
  /** IC HTTP gateway host. Default: "https://ic0.app" */
  host?: string;
  /** Max parallel canister queries. Default: 5 */
  concurrency?: number;
  /** Called after each SNS project is scanned */
  onProgress?: (progress: ScanProgress) => void;
  /** Include projects with zero balance and no neurons. Default: false */
  includeEmpty?: boolean;
}

export type { Principal };
