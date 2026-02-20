/**
 * Script to generate the SNS snapshot data.
 * Run: node scripts/gen-snapshot.mjs
 * Requires the library to be built first: npm run build
 */
import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { SnsSwapCanister } from "@dfinity/sns";
import { fetchSnsProjects } from "../dist/index.js";

const HOST = "https://ic0.app";

// SnsSwapLifecycle enum values
const SnsSwapLifecycle = {
  Unspecified: 0,
  Pending: 1,
  Open: 2,
  Committed: 3,
  Aborted: 4,
  Adopted: 5,
};

async function fetchLifecycle(swapCanisterId, agent) {
  try {
    const canister = SnsSwapCanister.create({
      canisterId: Principal.fromText(swapCanisterId),
      agent,
    });
    const resp = await canister.getLifecycle({ certified: false });
    return resp.lifecycle[0] ?? SnsSwapLifecycle.Unspecified;
  } catch {
    return null;
  }
}

async function main() {
  const agent = await HttpAgent.create({ host: HOST });

  // We need to also get swap canister IDs — fetch raw from SNS-WASM first
  const { Actor } = await import("@dfinity/agent");
  const SNS_WASM_CANISTER_ID = "qaa6y-5yaaa-aaaaa-aaafa-cai";
  const idlFactory = ({ IDL }) => {
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
  const actor = Actor.createActor(idlFactory, {
    canisterId: Principal.fromText(SNS_WASM_CANISTER_ID),
    agent,
  });

  process.stderr.write("Fetching SNS instances from SNS-WASM...\n");
  const { instances } = await actor.list_deployed_snses({});
  const valid = instances.filter(
    (d) => d.root_canister_id[0] && d.governance_canister_id[0] && d.ledger_canister_id[0]
  );

  // Build swap canister ID map: rootId -> swapId
  const swapMap = new Map();
  for (const d of valid) {
    const rootId = d.root_canister_id[0]?.toText();
    const swapId = d.swap_canister_id[0]?.toText();
    if (rootId && swapId) swapMap.set(rootId, swapId);
  }

  process.stderr.write("Fetching project metadata...\n");
  const fetchedAt = Date.now();
  const projects = await fetchSnsProjects({
    onProgress(p) {
      process.stderr.write(`  ${p.fetched}/${p.total}\r`);
    },
  });
  process.stderr.write(`\nFetched ${projects.length} projects\n`);

  // Enrich with swap canister ID and lifecycle
  process.stderr.write("Fetching swap lifecycles...\n");
  const enriched = [];
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const swapCanisterId = swapMap.get(p.rootCanisterId) ?? "";
    let lifecycle = SnsSwapLifecycle.Unspecified;
    if (swapCanisterId) {
      const lc = await fetchLifecycle(swapCanisterId, agent);
      if (lc !== null) lifecycle = lc;
    }
    enriched.push({ ...p, swapCanisterId, lifecycle });
    process.stderr.write(`  lifecycle: ${i + 1}/${projects.length}\r`);
  }
  process.stderr.write("\n");

  const committed = enriched.filter((p) => p.lifecycle === SnsSwapLifecycle.Committed);
  process.stderr.write(`Committed projects: ${committed.length}/${enriched.length}\n`);

  const output = {
    fetchedAt,
    projects: enriched,
  };

  process.stdout.write(JSON.stringify(output, null, 2));
  process.stderr.write("\nDone!\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
