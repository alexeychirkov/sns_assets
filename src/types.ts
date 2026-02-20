import type { Principal } from "@dfinity/principal";

// ─── SNS Aggregator ────────────────────────────────────────────────────────

export interface SnsCanisterIds {
  root_canister_id: string;
  governance_canister_id: string;
  ledger_canister_id: string;
  swap_canister_id: string;
  index_canister_id: string;
}

export interface SnsMeta {
  name: string;
  description?: string;
  url?: string;
  logo?: string;
}

/** Raw SNS project as returned by the aggregator HTTP endpoint */
export interface RawSnsProject {
  canister_ids: SnsCanisterIds;
  meta: SnsMeta;
  icrc1_metadata?: Array<[string, { Text?: string; Nat?: string }]>;
}

/** Parsed SNS project with resolved token info */
export interface SnsProject {
  name: string;
  description?: string;
  url?: string;
  logo?: string;
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
  /** Staked amount in smallest token units (e8s) */
  stakeE8s: bigint;
  /** Accrued maturity in smallest token units */
  maturityE8s: bigint;
  state: NeuronState;
  /** Remaining dissolve delay in seconds (0 if dissolved/dissolving and past) */
  dissolveDelaySeconds: bigint;
  /** Unix timestamp (seconds) when the neuron will be dissolved, only if dissolving */
  dissolveAt?: bigint;
  /** Voting power percentage multiplier (0-100) */
  votingPowerPercentageMultiplier: bigint;
}

// ─── Results ───────────────────────────────────────────────────────────────

export interface SnsProjectAssets {
  project: SnsProject;
  /** Neurons owned by (or hotkeyed to) the queried principal */
  neurons: SnsNeuronInfo[];
  /** Token balance of the principal's default account (in smallest units) */
  tokenBalance: bigint;
  /** Whether any asset was found */
  hasAssets: boolean;
}

// ─── Progress ──────────────────────────────────────────────────────────────

export type ScanPhase =
  | "fetching-sns-list"
  | "scanning"
  | "done"
  | "error";

export interface ScanProgress {
  phase: ScanPhase;
  /** Total number of SNS projects found */
  total: number;
  /** Number of SNS projects fully scanned so far */
  scanned: number;
  /** Name of the SNS currently being scanned (if applicable) */
  current?: string;
  error?: string;
}

// ─── Options ───────────────────────────────────────────────────────────────

export interface ScanOptions {
  /** IC HTTP gateway host. Defaults to "https://ic0.app" */
  host?: string;
  /**
   * Max number of SNS projects to query simultaneously.
   * Defaults to 5.
   */
  concurrency?: number;
  /**
   * Called whenever scan progress changes.
   */
  onProgress?: (progress: ScanProgress) => void;
  /**
   * If true, include SNS projects with zero balance and no neurons.
   * Defaults to false.
   */
  includeEmpty?: boolean;
}

// ─── Async generator result ────────────────────────────────────────────────

export interface SnsProjectScanEvent {
  project: SnsProject;
  result: SnsProjectAssets | null;
  error?: string;
}

export type { Principal };
