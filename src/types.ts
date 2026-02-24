import type { Principal } from "@dfinity/principal";

// ─── SNS Project ───────────────────────────────────────────────────────────

export interface SnsCanisterIds {
  governanceCanisterId: string;
  ledgerCanisterId: string;
  rootCanisterId: string;
}

export interface SnsProjectMetadata {
  /** Absent if ICRC-1 metadata fetch failed */
  tokenSymbol?: string;
  /** Absent if ICRC-1 metadata fetch failed */
  tokenDecimals?: number;
  /** Data URI for the project logo fetched from governance get_metadata */
  logoDataUrl?: string;
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
export interface SnsProject extends SnsCanisterIds, SnsProjectMetadata {
  name: string;
}

// ─── Neurons ───────────────────────────────────────────────────────────────

export type NeuronState = "locked" | "dissolving" | "dissolved";

export enum NeuronPermissionType {
  Unspecified = 0,
  ConfigureDissolveState = 1,
  ManagePrincipals = 2,
  SubmitProposal = 3,
  Vote = 4,
  Disburse = 5,
  Split = 6,
  MergeMaturity = 7,
  DisburseMaturity = 8,
  StakeMaturity = 9,
  ManageVotingPermission = 10,
}

export const getNeuronPermissionName = (value: number): string => {
  switch (value) {
    case NeuronPermissionType.Unspecified:
      return "Unspecified";
    case NeuronPermissionType.ConfigureDissolveState:
      return "ConfigureDissolveState";
    case NeuronPermissionType.ManagePrincipals:
      return "ManagePrincipals";
    case NeuronPermissionType.SubmitProposal:
      return "SubmitProposal";
    case NeuronPermissionType.Vote:
      return "Vote";
    case NeuronPermissionType.Disburse:
      return "Disburse";
    case NeuronPermissionType.Split:
      return "Split";
    case NeuronPermissionType.MergeMaturity:
      return "MergeMaturity";
    case NeuronPermissionType.DisburseMaturity:
      return "DisburseMaturity";
    case NeuronPermissionType.StakeMaturity:
      return "StakeMaturity";
    case NeuronPermissionType.ManageVotingPermission:
      return "ManageVotingPermission";
    default:
      return "Unknown Permission";
  }
};

export interface NeuronPermission {
  /** Text representation of the principal, or null if the field is absent */
  principal: string | null;
  permission_type: NeuronPermissionType[];
}

// ─── Neuron balances ───────────────────────────────────────────────────────

/** All token amounts for a single neuron, in smallest token units */
export interface NeuronBalance {
  stakeE8s: bigint;
  maturityE8s: bigint;
  stakedMaturityE8s: bigint;
  /** Total maturity = available + staked + disbursing */
  totalMaturityE8s: bigint;
  /** stakeE8s + totalMaturityE8s — pre-computed for sorting/display */
  totalValue: bigint;
}

export interface SnsNeuronInfo {
  /** Hex-encoded neuron ID */
  id: string;
  state: NeuronState;
  /** Remaining dissolve delay in seconds */
  dissolveDelaySeconds: bigint;
  /** Unix timestamp (seconds) when the neuron dissolves; only if dissolving */
  dissolveAt?: bigint;
  votingPowerPercentageMultiplier: bigint;
  /** Full permissions list from the governance canister */
  permissions: NeuronPermission[];
  /** true if the scanned principal is the sole holder of ManagePrincipals */
  isSoleOwner: boolean;
  /** All token amounts for this neuron */
  balance: NeuronBalance;
  /** USD / ICP value — present after applyValuation() */
  valuation?: NeuronValuation;
}

// ─── Cumulative (aggregate over multiple neurons) ──────────────────────────

/** Sum of token amounts across a set of neurons */
export interface NeuronCumulative {
  stakeE8s: bigint;
  maturityE8s: bigint;
  stakedMaturityE8s: bigint;
  totalMaturityE8s: bigint;
}

// ─── Project-level balances ─────────────────────────────────────────────────

/** All token amounts for one SNS project (free balance + neuron aggregates) */
export interface ProjectBalance {
  /** Free token balance in smallest token units */
  tokenBalance: bigint;
  /** Cumulative balances summed across ALL neurons */
  neuronsTotal: NeuronCumulative;
  /** Cumulative balances summed across isSoleOwner neurons only */
  neuronsOwner: NeuronCumulative;
  /**
   * Pre-computed owned total = tokenBalance + neuronsOwner.stakeE8s + neuronsOwner.totalMaturityE8s.
   * Useful for sorting and display.
   */
  totalValue: bigint;
}

// ─── Valuation ─────────────────────────────────────────────────────────────

/**
 * Prices for one token as returned by the price feed.
 * All fields are plain **number** (float).
 */
export interface TokenPrices {
  /** Price of 1 ICP in USD */
  icpPriceUsd: number;
  /** Price of one whole governance token in USD */
  tokenPriceUsd: number;
  /** Price of one whole governance token in ICP */
  tokenPriceIcp: number;
}

/**
 * USD / ICP value of a single neuron.
 * USD in **e6s** (1 USD = 1_000_000n), ICP in **e8s** (1 ICP = 100_000_000n).
 */
export interface NeuronValuation {
  valueUsd: bigint;
  valueIcp: bigint;
}

/**
 * Aggregated valuation for one SNS project.
 * USD in **e6s** (1 USD = 1_000_000n), ICP in **e8s** (1 ICP = 100_000_000n).
 */
export interface ProjectValuation {
  /** Prices used to compute all bigint fields below */
  prices: TokenPrices;
  /** Free token balance in USD e6s */
  tokenBalanceUsd: bigint;
  /** Free token balance in ICP e8s */
  tokenBalanceIcp: bigint;
  /** All neurons combined (stake + total maturity) in USD e6s */
  neuronsValueUsd: bigint;
  /** All neurons combined in ICP e8s */
  neuronsValueIcp: bigint;
  /** isSoleOwner neurons only in USD e6s */
  ownerNeuronsValueUsd: bigint;
  /** isSoleOwner neurons only in ICP e8s */
  ownerNeuronsValueIcp: bigint;
  /** tokenBalance + all neurons in USD e6s */
  totalValueUsd: bigint;
  /** tokenBalance + all neurons in ICP e8s */
  totalValueIcp: bigint;
  /** tokenBalance + isSoleOwner neurons in USD e6s */
  ownerValueUsd: bigint;
  /** tokenBalance + isSoleOwner neurons in ICP e8s */
  ownerValueIcp: bigint;
}

// ─── Results ───────────────────────────────────────────────────────────────

export interface SnsProjectAssets {
  project: SnsProject;
  /** Neurons owned by (or hotkeyed to) the queried principal */
  neurons: SnsNeuronInfo[];
  hasAssets: boolean;
  /** All token balances (free + aggregated neurons) for this project */
  balance: ProjectBalance;
  /** USD / ICP valuation — present after applyValuation() */
  valuation?: ProjectValuation;
}

/** Result of scanning a principal across all SNS projects */
export interface ScanResult {
  /** Projects where assets were found (or all, if includeEmpty=true) */
  assets: SnsProjectAssets[];
  /** Projects where governance or ledger canister failed to respond */
  failed: ScanProjectError[];
}

// ─── Progress ──────────────────────────────────────────────────────────────

export type FetchPhase = "fetching" | "done" | "error";
export type ScanPhase = "scanning" | "done" | "error";

export interface FetchProgress {
  phase: FetchPhase;
  /** Projects enriched so far */
  fetched: number;
  /** Total projects to enrich (known after list_deployed_snses returns) */
  total: number;
  /** The newly fetched project, present when a new project was just processed */
  project?: SnsProject;
  error?: string;
}

// ─── Scan errors ───────────────────────────────────────────────────────────

/** Describes a project that could not be fully scanned */
export interface ScanProjectError {
  project: SnsProject;
  /** Governance canister failed to respond */
  governanceFailed: boolean;
  /** Ledger canister failed to respond */
  ledgerFailed: boolean;
  error: string;
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
  /** IC HTTP gateway host. Default: "https://icp0.io" */
  host?: string;
  /** Called as pages are fetched (useful for large lists) */
  onProgress?: (progress: FetchProgress) => void;
  /**
   * Projects already known to the caller (e.g. from a snapshot).
   * Metadata will only be fetched for projects whose rootCanisterId is
   * NOT present in this list, drastically reducing network calls.
   */
  knownProjects?: SnsProject[];
  excludedProjects?: string[]; // List of rootCanisterIds to exclude
}

export interface ScanOptions {
  /** IC HTTP gateway host. Default: "https://icp0.io" */
  host?: string;
  /** Max parallel canister queries. Default: 5 */
  concurrency?: number;
  /** Called after each SNS project is scanned */
  onProgress?: (progress: ScanProgress) => void;
  /** Include projects with zero balance and no neurons. Default: false */
  includeEmpty?: boolean;
}

export type { Principal };
