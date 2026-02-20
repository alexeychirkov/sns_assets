import { Principal } from "@dfinity/principal";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import type { HttpAgent } from "@dfinity/agent";

/**
 * Fetch the ICRC-1 token balance of a principal's default account
 * from an SNS ledger canister.
 */
export async function fetchTokenBalance(
  ledgerCanisterId: string,
  owner: Principal,
  agent: HttpAgent
): Promise<bigint> {
  const canister = IcrcLedgerCanister.create({
    canisterId: Principal.fromText(ledgerCanisterId),
    agent,
  });

  return canister.balance({ owner, certified: false });
}
