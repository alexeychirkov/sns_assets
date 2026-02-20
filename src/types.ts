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
  /** Data URI for the project logo fetched from governance get_metadata */
  logoDataUrl?: string;
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
    case NeuronPermissionType.Unspecified: return "Unspecified";
    case NeuronPermissionType.ConfigureDissolveState: return "ConfigureDissolveState";
    case NeuronPermissionType.ManagePrincipals: return "ManagePrincipals";
    case NeuronPermissionType.SubmitProposal: return "SubmitProposal";
    case NeuronPermissionType.Vote: return "Vote";
    case NeuronPermissionType.Disburse: return "Disburse";
    case NeuronPermissionType.Split: return "Split";
    case NeuronPermissionType.MergeMaturity: return "MergeMaturity";
    case NeuronPermissionType.DisburseMaturity: return "DisburseMaturity";
    case NeuronPermissionType.StakeMaturity: return "StakeMaturity";
    case NeuronPermissionType.ManageVotingPermission: return "ManageVotingPermission";
    default: return "Unknown Permission";
  }
};

export interface NeuronPermission {
  /** Text representation of the principal, or null if the field is absent */
  principal: string | null;
  permission_type: NeuronPermissionType[];
}

export interface SnsNeuronInfo {
  /** Hex-encoded neuron ID */
  id: string;
  /** Staked amount in smallest token units (cached_neuron_stake_e8s) */
  stakeE8s: bigint;
  /** Available maturity in smallest token units */
  maturityE8s: bigint;
  /** Staked maturity in smallest token units */
  stakedMaturityE8s: bigint;
  /** Total maturity = available + staked + disbursing */
  totalMaturityE8s: bigint;
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
}

// ─── Cumulative ────────────────────────────────────────────────────────────

export interface NeuronCumulative {
  stakeE8s: bigint;
  /** Available maturity */
  maturityE8s: bigint;
  /** Staked maturity */
  stakedMaturityE8s: bigint;
  /** Total maturity = available + staked + disbursing */
  totalMaturityE8s: bigint;
}

export interface SnsProjectCumulative {
  /** Summed across all neurons returned for the principal */
  total: NeuronCumulative;
  /** Summed only for neurons where isSoleOwner === true */
  owner: NeuronCumulative;
}

// ─── Results ───────────────────────────────────────────────────────────────

export interface SnsProjectAssets {
  project: SnsProject;
  /** Neurons owned by (or hotkeyed to) the queried principal */
  neurons: SnsNeuronInfo[];
  /** Token balance in smallest units (bigint) */
  tokenBalance: bigint;
  hasAssets: boolean;
  /** Cumulative stake + maturity totals */
  cumulative: SnsProjectCumulative;
  /**
   * Total owned value = tokenBalance + owner stake + owner total maturity.
   * All amounts are in smallest token units.
   */
  totalValue: bigint;
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
