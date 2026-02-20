import { Principal } from "@dfinity/principal";
import { SnsGovernanceCanister } from "@dfinity/sns";
import type { HttpAgent } from "@dfinity/agent";
import type { SnsNeuron } from "@dfinity/sns";
import type { NeuronState, SnsNeuronInfo } from "./types.js";

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
    return { state: "dissolved", dissolveDelaySeconds: 0n };
  }

  if ("DissolveDelaySeconds" in ds) {
    const delay = ds.DissolveDelaySeconds;
    return {
      state: delay === 0n ? "dissolved" : "locked",
      dissolveDelaySeconds: delay,
    };
  }

  if ("WhenDissolvedTimestampSeconds" in ds) {
    const when = ds.WhenDissolvedTimestampSeconds;
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const remaining = when > nowSec ? when - nowSec : 0n;
    return {
      state: "dissolving",
      dissolveDelaySeconds: remaining,
      dissolveAt: when,
    };
  }

  return { state: "dissolved", dissolveDelaySeconds: 0n };
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

    return {
      id: rawId ? neuronIdToHex(rawId.id) : "unknown",
      stakeE8s: n.cached_neuron_stake_e8s,
      maturityE8s: n.maturity_e8s_equivalent,
      state,
      dissolveDelaySeconds,
      dissolveAt,
      votingPowerPercentageMultiplier: n.voting_power_percentage_multiplier,
    };
  });
}
