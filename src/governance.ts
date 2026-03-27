import type { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import type { SnsNeuron } from "@dfinity/sns";
import { SnsGovernanceCanister } from "@dfinity/sns";
import type {
  NeuronBalance,
  NeuronPermission,
  NeuronState,
  NervousSystemParamsInfo,
  SnsNeuronInfo,
} from "./types";
import { NeuronPermissionType } from "./types";

function neuronIdToHex(id: Uint8Array | number[]): string {
  return Array.from(id)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function resolveDissolveState(neuron: SnsNeuron): {
  state: NeuronState;
  dissolveDelaySeconds: bigint;
  dissolveAt?: bigint;
} {
  const ds = neuron.dissolve_state[0];

  if (!ds) {
    return { state: "dissolved", dissolveDelaySeconds: BigInt(0) };
  }

  if ("DissolveDelaySeconds" in ds) {
    const delay = ds.DissolveDelaySeconds;
    return {
      state: delay === BigInt(0) ? "dissolved" : "locked",
      dissolveDelaySeconds: delay,
    };
  }

  if ("WhenDissolvedTimestampSeconds" in ds) {
    const when = ds.WhenDissolvedTimestampSeconds;
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const remaining = when > nowSec ? when - nowSec : BigInt(0);
    return {
      state: "dissolving",
      dissolveDelaySeconds: remaining,
      dissolveAt: when,
    };
  }

  return { state: "dissolved", dissolveDelaySeconds: BigInt(0) };
}

/**
 * Fetch all SNS neurons for a given principal from a governance canister.
 * Paginates through results automatically.
 */
export async function fetchNeurons(
  governanceCanisterId: string,
  principal: Principal,
  agent: HttpAgent
): Promise<SnsNeuronInfo[]> {
  const canister = SnsGovernanceCanister.create({
    canisterId: Principal.fromText(governanceCanisterId),
    agent,
  });

  const neurons = await canister.listNeurons({
    principal,
    limit: 100,
    certified: false,
  });

  return neurons.map((n): SnsNeuronInfo => {
    const rawId = n.id[0];
    const { state, dissolveDelaySeconds, dissolveAt } = resolveDissolveState(n);

    const permissions: NeuronPermission[] = n.permissions.map((p) => ({
      principal: p.principal[0]?.toText() ?? null,
      permission_type: Array.from(p.permission_type) as NeuronPermissionType[],
    }));

    const stakedMaturityE8s = n.staked_maturity_e8s_equivalent[0] ?? BigInt(0);
    const totalDisbursingMaturity = n.disburse_maturity_in_progress.reduce(
      (acc, d) => acc + d.amount_e8s,
      BigInt(0)
    );
    const totalMaturityE8s =
      n.maturity_e8s_equivalent + stakedMaturityE8s + totalDisbursingMaturity;

    const managePrincipals = permissions
      .filter((p) => p.permission_type.includes(NeuronPermissionType.ManagePrincipals))
      .map((p) => p.principal)
      .filter((p): p is string => p !== null);

    const isSoleOwner = managePrincipals.length === 1 && managePrincipals[0] === principal.toText();

    const balance: NeuronBalance = {
      stakeE8s: n.cached_neuron_stake_e8s,
      maturityE8s: n.maturity_e8s_equivalent,
      stakedMaturityE8s,
      totalMaturityE8s,
      totalValue: n.cached_neuron_stake_e8s + totalMaturityE8s,
    };

    return {
      id: rawId ? neuronIdToHex(rawId.id) : "unknown",
      state,
      dissolveDelaySeconds,
      dissolveAt,
      votingPowerPercentageMultiplier: n.voting_power_percentage_multiplier,
      permissions,
      isSoleOwner,
      balance,
    };
  });
}

/**
 * Fetch nervous system parameters (grantable + claimer permissions) from a
 * governance canister. Does not require a principal — non-certified query.
 */
export async function fetchNervousSystemParameters(
  governanceCanisterId: string,
  agent: HttpAgent
): Promise<NervousSystemParamsInfo> {
  const canister = SnsGovernanceCanister.create({
    canisterId: Principal.fromText(governanceCanisterId),
    agent,
  });
  const params = await canister.nervousSystemParameters({ certified: false });

  const grantablePermissions = Array.from(
    params.neuron_grantable_permissions[0]?.permissions ?? []
  ) as NeuronPermissionType[];

  const claimerPermissions = Array.from(
    params.neuron_claimer_permissions[0]?.permissions ?? []
  ) as NeuronPermissionType[];

  console.log(`[SNS params] ${governanceCanisterId.slice(0, 10)}…`, {
    grantable: grantablePermissions,
    claimer: claimerPermissions,
    raw_grantable: params.neuron_grantable_permissions,
    raw_claimer: params.neuron_claimer_permissions,
  });

  return { grantablePermissions, claimerPermissions };
}
