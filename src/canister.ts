import { Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import type { HttpAgent } from "@dfinity/agent";
import type { SnsProject, FetchOptions } from "./types.js";

/** SNS-WASM canister on the NNS subnet */
const SNS_WASM_CANISTER_ID = "qaa6y-5yaaa-aaaaa-aaafa-cai";

interface DeployedSnsRaw {
  root_canister_id: [] | [Principal];
  governance_canister_id: [] | [Principal];
  ledger_canister_id: [] | [Principal];
  swap_canister_id: [] | [Principal];
  index_canister_id: [] | [Principal];
}

interface SnsWasmActor {
  list_deployed_snses: (req: Record<string, never>) => Promise<{
    instances: DeployedSnsRaw[];
  }>;
}

// Minimal inline Candid IDL — only list_deployed_snses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const idlFactory = ({ IDL }: { IDL: any }) => {
  const DeployedSns = IDL.Record({
    root_canister_id: IDL.Opt(IDL.Principal),
    governance_canister_id: IDL.Opt(IDL.Principal),
    ledger_canister_id: IDL.Opt(IDL.Principal),
    swap_canister_id: IDL.Opt(IDL.Principal),
    index_canister_id: IDL.Opt(IDL.Principal),
  });
  return IDL.Service({
    list_deployed_snses: IDL.Func(
      [IDL.Record({})],
      [IDL.Record({ instances: IDL.Vec(DeployedSns) })],
      ["query"]
    ),
  });
};

/**
 * Fetch deployed SNS instances directly from the SNS-WASM canister
 * (`qaa6y-5yaaa-aaaaa-aaafa-cai`) via `list_deployed_snses`.
 *
 * Returns only canister IDs — no name / logo / token metadata.
 */
export async function fetchFromCanister(
  agent: HttpAgent,
  options: Pick<FetchOptions, "onProgress"> = {}
): Promise<SnsProject[]> {
  const actor = Actor.createActor<SnsWasmActor>(idlFactory, {
    canisterId: Principal.fromText(SNS_WASM_CANISTER_ID),
    agent,
  });

  const { instances } = await actor.list_deployed_snses({});

  const projects = instances
    .filter((d) => d.root_canister_id[0] && d.governance_canister_id[0] && d.ledger_canister_id[0])
    .map((d): SnsProject => {
      const rootId = d.root_canister_id[0]!.toText();
      return {
        name: rootId,
        governanceCanisterId: d.governance_canister_id[0]!.toText(),
        ledgerCanisterId: d.ledger_canister_id[0]!.toText(),
        rootCanisterId: rootId,
        tokenSymbol: "?",
        tokenDecimals: 8,
        source: "canister",
      };
    });

  options.onProgress?.({ phase: "done", fetched: projects.length });
  return projects;
}
