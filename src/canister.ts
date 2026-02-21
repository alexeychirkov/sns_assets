import type { HttpAgent } from "@dfinity/agent";
import { Actor } from "@dfinity/agent";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { SnsGovernanceCanister } from "@dfinity/sns";
import type { FetchOptions, SnsProject } from "./types";

/** SNS-WASM canister on the NNS subnet */
const SNS_WASM_CANISTER_ID = "qaa6y-5yaaa-aaaaa-aaafa-cai";

/** Concurrency for ICRC-1 metadata fetches */
const METADATA_CONCURRENCY = 10;

interface DeployedSnsRaw {
  root_canister_id: [] | [Principal];
  governance_canister_id: [] | [Principal];
  ledger_canister_id: [] | [Principal];
  index_canister_id: [] | [Principal];
}

interface Icrc1MetaResult {
  name: string;
  symbol: string;
  decimals: number;
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

/** Returns null if the canister did not respond */
async function fetchIcrc1Meta(
  ledgerCanisterId: string,
  agent: HttpAgent
): Promise<Icrc1MetaResult | null> {
  try {
    const canister = IcrcLedgerCanister.create({
      canisterId: Principal.fromText(ledgerCanisterId),
      agent,
    });
    const entries = await canister.metadata({ certified: false });
    let name = ledgerCanisterId;
    let symbol = "?";
    let decimals = 8;
    for (const [key, val] of entries) {
      if (key === "icrc1:name" && "Text" in val) name = (val as { Text: string }).Text;
      if (key === "icrc1:symbol" && "Text" in val) symbol = (val as { Text: string }).Text;
      if (key === "icrc1:decimals" && "Nat" in val) decimals = Number((val as { Nat: bigint }).Nat);
    }
    return { name, symbol, decimals };
  } catch {
    return null;
  }
}

async function fetchGovernanceLogo(
  governanceCanisterId: string,
  agent: HttpAgent
): Promise<string | undefined> {
  try {
    const canister = SnsGovernanceCanister.create({
      canisterId: Principal.fromText(governanceCanisterId),
      agent,
    });
    const meta = await canister.metadata({ certified: false });
    console.log(
      `SNS: [fetchGovernanceLogo][${governanceCanisterId}] fetched metadata for`,
      governanceCanisterId,
      meta
    );
    return meta.logo[0] ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch deployed SNS instances from the SNS-WASM canister via `list_deployed_snses`,
 * then enrich NEW projects with ICRC-1 metadata (name, symbol, decimals) and logo.
 * Projects whose rootCanisterId is already in `knownProjects` are returned as-is
 * without any network calls, making refreshes much faster.
 */
export async function fetchFromCanister(
  agent: HttpAgent,
  options: Pick<FetchOptions, "onProgress" | "knownProjects" | "excludedProjects"> = {}
): Promise<SnsProject[]> {
  const { onProgress, excludedProjects = [] } = options;
  const excludedSet = new Set(excludedProjects);
  const knownProjects = (options.knownProjects ?? []).filter(
    (p) => !excludedSet.has(p.rootCanisterId)
  );
  const knownMap = new Map(knownProjects.map((p) => [p.rootCanisterId, p]));

  const actor = Actor.createActor<SnsWasmActor>(idlFactory, {
    canisterId: Principal.fromText(SNS_WASM_CANISTER_ID),
    agent,
  });

  const { instances } = await actor.list_deployed_snses({});

  const valid = instances.filter(
    (d) =>
      d.root_canister_id[0] &&
      d.governance_canister_id[0] &&
      d.ledger_canister_id[0] &&
      !excludedSet.has(d.root_canister_id[0]!.toText())
  );

  const total = valid.length;
  // How many valid instances are already in our known set — start counter here
  const alreadyKnown = valid.filter((d) => knownMap.has(d.root_canister_id[0]!.toText())).length;

  const newInstances = valid.filter((d) => !knownMap.has(d.root_canister_id[0]!.toText()));

  console.log(
    `SNS: [fetchFromCanister] total on-chain: ${total}, known: ${knownMap.size}, new: ${newInstances.length}`
  );
  if (newInstances.length > 0) {
    console.log(
      `SNS: [fetchFromCanister] fetching NEW projects:`,
      newInstances.map((d) => d.root_canister_id[0]!.toText())
    );
  } else {
    console.log(
      `SNS: [fetchFromCanister] nothing new to fetch — all on-chain projects are in knownProjects`
    );
  }

  const newProjects: SnsProject[] = [];
  const queue = [...newInstances];
  let fetched = alreadyKnown;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const d = queue.shift()!;
      const rootId = d.root_canister_id[0]!.toText();
      const ledgerId = d.ledger_canister_id[0]!.toText();
      const govId = d.governance_canister_id[0]!.toText();

      const [meta, logo] = await Promise.all([
        fetchIcrc1Meta(ledgerId, agent),
        fetchGovernanceLogo(govId, agent),
      ]);

      const project: SnsProject = {
        name: meta?.name ?? ledgerId,
        governanceCanisterId: govId,
        ledgerCanisterId: ledgerId,
        rootCanisterId: rootId,
        ...(meta ? { tokenSymbol: meta.symbol, tokenDecimals: meta.decimals } : {}),
        ...(logo !== undefined ? { logoDataUrl: logo } : {}),
      };

      newProjects.push(project);
      fetched++;

      onProgress?.({
        phase: "fetching",
        fetched,
        total,
        project,
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(METADATA_CONCURRENCY, Math.max(newInstances.length, 1)) }, worker)
  );
  onProgress?.({ phase: "done", fetched, total });

  const result = [...knownProjects, ...newProjects];
  console.log(
    `SNS: [fetchFromCanister] done fetching metadata for new projects. Total projects: ${knownProjects.length + newProjects.length}`,
    result
  );
  return result;
}
