import type { HttpAgent } from "@dfinity/agent";
import type { SnsProject, FetchOptions } from "./types.js";
import { fetchFromAggregator } from "./aggregator.js";
import { fetchFromCanister } from "./canister.js";

/**
 * Fetch the SNS project list according to the requested source(s).
 *
 * - `"aggregator"` — paginates the HTTP REST endpoint (includes metadata)
 * - `"canister"`   — calls `list_deployed_snses` on `qaa6y-…-cai` (IDs only)
 * - `"both"`       — fetches both in parallel, deduplicates by `rootCanisterId`;
 *                    aggregator metadata wins when a project appears in both
 */
export async function fetchFromSources(
  source: FetchOptions["source"] = "both",
  agent: HttpAgent,
  options: Pick<FetchOptions, "onProgress"> = {}
): Promise<SnsProject[]> {
  if (source === "aggregator") {
    return fetchFromAggregator(options);
  }

  if (source === "canister") {
    return fetchFromCanister(agent, options);
  }

  // "both" — parallel fetch + merge by rootCanisterId
  const [fromAggregator, fromCanister] = await Promise.all([
    fetchFromAggregator(),
    fetchFromCanister(agent),
  ]);

  const byRoot = new Map<string, SnsProject>(fromAggregator.map((p) => [p.rootCanisterId, p]));
  const result = new Map<string, SnsProject>(byRoot);

  for (const cp of fromCanister) {
    const existing = byRoot.get(cp.rootCanisterId);
    if (existing) {
      // Found in both — keep aggregator metadata, upgrade source tag
      result.set(cp.rootCanisterId, { ...existing, source: "both" });
    } else {
      // Only in canister
      result.set(cp.rootCanisterId, cp);
    }
  }

  const projects = Array.from(result.values());
  options.onProgress?.({ phase: "done", fetched: projects.length });
  return projects;
}
