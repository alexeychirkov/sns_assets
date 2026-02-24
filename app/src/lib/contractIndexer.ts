import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

import type { GetHoldersResponse, _SERVICE } from "../candid/contract_indexer/contract_indexer.did";
import { idlFactory } from "../candid/contract_indexer/contract_indexer.did.js";

/** Canister ID of the contract_indexer on mainnet. */
export const CONTRACT_INDEXER_CANISTER_ID = "cvpez-jaaaa-aaaah-qszqa-cai";

const PAGE_SIZE = 100n;

/**
 * Creates an anonymous read-only actor for the contract_indexer canister.
 */
function createIndexerActor(): _SERVICE {
  const agent = new HttpAgent({ host: "https://ic0.app" });
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: CONTRACT_INDEXER_CANISTER_ID,
  });
}

/**
 * Paginates through all holder entries in the contract_indexer and returns the
 * nns_principal for the entry whose contract_id matches `contractPrincipal`.
 *
 * Throws a user-facing error if the entry is not found or has no nns_principal.
 */
export async function resolveNnsPrincipal(contractPrincipal: Principal): Promise<Principal> {
  const actor = createIndexerActor();
  const targetText = contractPrincipal.toText();

  let startAfter: [] | [Principal] = [];

  for (;;) {
    const response: GetHoldersResponse = await actor.get_holders({
      start_after: startAfter,
      limit: [PAGE_SIZE],
    });

    if (!("Ok" in response)) {
      throw new Error("contract_indexer returned an unexpected response");
    }

    const { holders } = response.Ok;

    for (const entry of holders) {
      if (entry.contract_id.toText() === targetText) {
        if (entry.nns_principal.length === 0) {
          throw new Error("Holder contract found, but it has no associated NNS principal yet");
        }
        return entry.nns_principal[0];
      }
    }

    // No more pages
    if (holders.length < Number(PAGE_SIZE)) {
      break;
    }

    // Cursor: use the contract_id of the last entry from this page
    startAfter = [holders[holders.length - 1].contract_id];
  }

  throw new Error(`No holder entry found in contract_indexer for contract: ${targetText}`);
}
