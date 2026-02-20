import type { RawSnsProject, SnsProject, FetchOptions } from "./types.js";

/** SNS aggregator canister HTTP endpoint */
const AGGREGATOR_BASE = "https://qaa6y-5yaaa-aaaaa-aaafa-cai.raw.ic0.app/v1/snses";

const PAGE_SIZE = 100;

/**
 * Fetch all SNS projects from the aggregator canister's REST HTTP API.
 * Paginates automatically until all projects are retrieved.
 */
export async function fetchFromAggregator(
  options: Pick<FetchOptions, "onProgress"> = {}
): Promise<SnsProject[]> {
  const projects: SnsProject[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(`${AGGREGATOR_BASE}?offset=${offset}&limit=${PAGE_SIZE}`);

    if (!res.ok) {
      throw new Error(`SNS aggregator HTTP ${res.status}: ${res.statusText}`);
    }

    const body = await res.json();
    const page: RawSnsProject[] = Array.isArray(body) ? body : (body.data ?? body.snses ?? []);

    if (page.length === 0) break;

    for (const raw of page) {
      const parsed = parseRawProject(raw);
      if (parsed) projects.push(parsed);
    }

    options.onProgress?.({ phase: "fetching", fetched: projects.length });

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return projects;
}

function parseRawProject(raw: RawSnsProject): SnsProject | null {
  const ids = raw.canister_ids;
  if (!ids?.governance_canister_id || !ids?.ledger_canister_id) return null;

  const name = raw.meta?.name ?? ids.root_canister_id;

  // Extract token symbol and decimals from ICRC-1 metadata array
  let tokenSymbol = "TOKEN";
  let tokenDecimals = 8;

  if (Array.isArray(raw.icrc1_metadata)) {
    for (const [key, value] of raw.icrc1_metadata) {
      if (key === "icrc1:symbol" && value?.Text) {
        tokenSymbol = value.Text;
      }
      if (key === "icrc1:decimals" && value?.Nat !== undefined) {
        tokenDecimals = Number(value.Nat);
      }
    }
  }

  return {
    name,
    description: raw.meta?.description,
    url: raw.meta?.url,
    logo: raw.meta?.logo,
    governanceCanisterId: ids.governance_canister_id,
    ledgerCanisterId: ids.ledger_canister_id,
    rootCanisterId: ids.root_canister_id,
    tokenSymbol,
    tokenDecimals,
    source: "aggregator" as const,
  };
}
