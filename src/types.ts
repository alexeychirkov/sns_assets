import type { Principal } from "@dfinity/principal";

// ─── Source ────────────────────────────────────────────────────────────────

/** Where a particular SNS project was discovered */
export type SnsSource = "canister" | "aggregator" | "both";

/** Which source(s) to use when fetching the SNS project list */
export type SourceMode = "canister" | "aggregator" | "both";

// ─── SNS Project ───────────────────────────────────────────────────────────

/** Raw SNS project as returned by the aggregator HTTP endpoint (internal) */
export interface RawSnsProject {
  canister_ids: {
    root_canister_id: string;
    governance_canister_id: string;
    ledger_canister_id: string;
    swap_canister_id: string;
    index_canister_id: string;
  };
  meta?: { name?: string; description?: string; url?: string; logo?: string };
  icrc1_metadata?: Array<[string, { Text?: string; Nat?: string }]>;
}

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
  description?: string;
  url?: string;
  /** Base64 data URI or remote URL */
  logo?: string;
  governanceCanisterId: string;
  ledgerCanisterId: string;
  rootCanisterId: string;
  tokenSymbol: string;
  tokenDecimals: number;
  /** Where this project was discovered */
  source: SnsSource;
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
  /** Which source(s) to query for the SNS list. Default: "both" */
  source?: SourceMode;
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
