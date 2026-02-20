import type { HttpAgent } from "@dfinity/agent";
import { Actor } from "@dfinity/agent";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import { Principal } from "@dfinity/principal";
import { SnsGovernanceCanister, SnsSwapCanister } from "@dfinity/sns";
import type { FetchOptions, SnsProject } from "./types";
import { SnsSwapLifecycle } from "./types";

/** SNS-WASM canister on the NNS subnet */
const SNS_WASM_CANISTER_ID = "qaa6y-5yaaa-aaaaa-aaafa-cai";

/** Concurrency for ICRC-1 metadata fetches */
const METADATA_CONCURRENCY = 10;

interface DeployedSnsRaw {
  root_canister_id: [] | [Principal];
  governance_canister_id: [] | [Principal];
  ledger_canister_id: [] | [Principal];
  swap_canister_id: [] | [Principal];
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

/** Returns null if the canister did not respond */
async function fetchIcrc1Meta(ledgerCanisterId: string, agent: HttpAgent): Promise<Icrc1MetaResult | null> {
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
      if (key === "icrc1:decimals" && "Nat" in val)
        decimals = Number((val as { Nat: bigint }).Nat);
    }
    return { name, symbol, decimals };
  } catch {
    return null;
  }
}

/** Returns null if the canister did not respond */
async function fetchSwapLifecycle(swapCanisterId: string, agent: HttpAgent): Promise<SnsSwapLifecycle | null> {
  try {
    const canister = SnsSwapCanister.create({
      canisterId: Principal.fromText(swapCanisterId),
      agent,
    });
    const resp = await canister.getLifecycle({ certified: false });
    return (resp.lifecycle[0] ?? SnsSwapLifecycle.Unspecified) as SnsSwapLifecycle;
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
    return meta.logo[0] ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch deployed SNS instances from the SNS-WASM canister via `list_deployed_snses`,
 * then enrich each project with ICRC-1 metadata (name, symbol, decimals).
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

  const valid = instances.filter(
    (d) => d.root_canister_id[0] && d.governance_canister_id[0] && d.ledger_canister_id[0]
  );

  const projects: SnsProject[] = [];
  const queue = [...valid];
  const total = valid.length;

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const d = queue.shift()!;
      const rootId = d.root_canister_id[0]!.toText();
      const ledgerId = d.ledger_canister_id[0]!.toText();
      const govId = d.governance_canister_id[0]!.toText();
      const swapId = d.swap_canister_id[0]?.toText() ?? "";

      const [meta, logo, lifecycle] = await Promise.all([
        fetchIcrc1Meta(ledgerId, agent),
        fetchGovernanceLogo(govId, agent),
        swapId ? fetchSwapLifecycle(swapId, agent) : Promise.resolve(null),
      ]);

      // Build a partial project — only set fields that were successfully fetched
      const existing = projects.find((p) => p.rootCanisterId === rootId);
      const base: SnsProject = existing ?? {
        name: ledgerId,
        governanceCanisterId: govId,
        ledgerCanisterId: ledgerId,
        rootCanisterId: rootId,
        swapCanisterId: swapId,
        tokenSymbol: "?",
        tokenDecimals: 8,
      };

      const updated: SnsProject = {
        ...base,
        swapCanisterId: swapId || base.swapCanisterId,
        ...(meta ? { name: meta.name, tokenSymbol: meta.symbol, tokenDecimals: meta.decimals } : {}),
        ...(logo !== undefined ? { logoDataUrl: logo } : {}),
        ...(lifecycle !== null ? { lifecycle } : {}),
      };

      if (existing) {
        const idx = projects.indexOf(existing);
        projects[idx] = updated;
      } else {
        projects.push(updated);
      }

      // Report which fields updated successfully
      const progressProject: Partial<SnsProject> & { rootCanisterId: string } = {
        rootCanisterId: rootId,
        ...(meta ? { name: meta.name, tokenSymbol: meta.symbol, tokenDecimals: meta.decimals } : {}),
        ...(logo !== undefined ? { logoDataUrl: logo } : {}),
        ...(lifecycle !== null ? { lifecycle } : {}),
      };

      options.onProgress?.({
        phase: "fetching",
        fetched: projects.length,
        total,
        project: progressProject,
        metaOk: meta !== null,
        logoOk: logo !== undefined,
        lifecycleOk: lifecycle !== null,
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(METADATA_CONCURRENCY, valid.length) }, worker));
  options.onProgress?.({ phase: "done", fetched: projects.length, total });

  return projects;
}
