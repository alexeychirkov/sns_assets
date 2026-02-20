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

export type ScanPhase =
  | "idle"
  | "fetching-list"
  | "scanning"
  | "done"
  | "error";

export interface ScanState {
  phase: ScanPhase;
  total: number;
  scanned: number;
  current: string;
  results: SnsProjectResult[];
  error: string;
}
