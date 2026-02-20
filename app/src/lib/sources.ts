import type { HttpAgent } from "@dfinity/agent";
import type { SnsProject, SourceMode } from "./types";
import { fetchAllSnsProjects } from "./aggregator";
import { fetchSnsProjectsFromCanister } from "./canister";

/**
 * Fetch the SNS project list from the requested source(s).
 *
 * - "canister"   → calls list_deployed_snses on qaa6y-…-cai directly
 * - "aggregator" → paginates the HTTP REST endpoint
 * - "both"       → fetches both in parallel, deduplicates by rootCanisterId;
 *                  projects found in both get source = "both" and prefer
 *                  aggregator metadata (name, logo, token info)
 */
export async function fetchSnsProjects(
  mode: SourceMode,
  agent: HttpAgent
): Promise<SnsProject[]> {
  if (mode === "aggregator") {
    return fetchAllSnsProjects();
  }

  if (mode === "canister") {
    return fetchSnsProjectsFromCanister(agent);
  }

  // "both" — parallel fetch + merge
  const [fromAggregator, fromCanister] = await Promise.all([
    fetchAllSnsProjects(),
    fetchSnsProjectsFromCanister(agent),
  ]);

  // Index aggregator results by rootCanisterId
  const byRoot = new Map<string, SnsProject>(
    fromAggregator.map((p) => [p.rootCanisterId, p])
  );

  // Start result map with all aggregator projects
  const result = new Map<string, SnsProject>(byRoot);

  // Merge canister results
  for (const cp of fromCanister) {
    const existing = byRoot.get(cp.rootCanisterId);
    if (existing) {
      // Found in both — keep aggregator metadata, upgrade source
      result.set(cp.rootCanisterId, { ...existing, source: "both" });
    } else {
      // Only in canister
      result.set(cp.rootCanisterId, cp);
    }
  }

  return Array.from(result.values());
}
