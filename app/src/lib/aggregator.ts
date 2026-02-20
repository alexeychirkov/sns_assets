import type { SnsProject } from "./types";

const AGGREGATOR_BASE =
  "https://qaa6y-5yaaa-aaaaa-aaafa-cai.raw.ic0.app/v1/snses";

const PAGE_SIZE = 100;

interface RawSnsProject {
  canister_ids: {
    root_canister_id: string;
    governance_canister_id: string;
    ledger_canister_id: string;
  };
  meta?: { name?: string; description?: string; url?: string; logo?: string };
  icrc1_metadata?: Array<[string, { Text?: string; Nat?: string }]>;
}

export async function fetchAllSnsProjects(): Promise<SnsProject[]> {
  const projects: SnsProject[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${AGGREGATOR_BASE}?offset=${offset}&limit=${PAGE_SIZE}`
    );
    if (!res.ok) {
      throw new Error(`Aggregator HTTP ${res.status}: ${res.statusText}`);
    }

    const body = await res.json();
    const page: RawSnsProject[] = Array.isArray(body)
      ? body
      : (body.data ?? body.snses ?? []);

    if (page.length === 0) break;

    for (const raw of page) {
      const ids = raw.canister_ids;
      if (!ids?.governance_canister_id || !ids?.ledger_canister_id) continue;

      let tokenSymbol = "TOKEN";
      let tokenDecimals = 8;

      for (const [key, val] of raw.icrc1_metadata ?? []) {
        if (key === "icrc1:symbol" && val?.Text) tokenSymbol = val.Text;
        if (key === "icrc1:decimals" && val?.Nat !== undefined)
          tokenDecimals = Number(val.Nat);
      }

      projects.push({
        name: raw.meta?.name ?? ids.root_canister_id,
        description: raw.meta?.description,
        url: raw.meta?.url,
        logo: raw.meta?.logo,
        governanceCanisterId: ids.governance_canister_id,
        ledgerCanisterId: ids.ledger_canister_id,
        rootCanisterId: ids.root_canister_id,
        tokenSymbol,
        tokenDecimals,
      });
    }

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return projects;
}
