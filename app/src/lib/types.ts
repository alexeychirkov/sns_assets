/** Where the SNS root canister info was discovered */
export type SnsSource = "canister" | "aggregator" | "both";

/** Which source(s) to use when fetching the SNS project list */
export type SourceMode = "canister" | "aggregator" | "both";

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
  /** Where this project's root canister was discovered */
  source: SnsSource;
}

export type NeuronState = "locked" | "dissolving" | "dissolved";

export interface SnsNeuronInfo {
  id: string;
  stakeE8s: bigint;
  maturityE8s: bigint;
  state: NeuronState;
  dissolveDelaySeconds: bigint;
  dissolveAt?: bigint;
  votingPowerPercentageMultiplier: bigint;
}

export interface SnsProjectResult {
  project: SnsProject;
  neurons: SnsNeuronInfo[];
  tokenBalance: bigint;
  hasAssets: boolean;
}

export type ScanPhase = "idle" | "fetching-list" | "scanning" | "done" | "error";

export interface ScanState {
  phase: ScanPhase;
  total: number;
  scanned: number;
  current: string;
  results: SnsProjectResult[];
  error: string;
}
