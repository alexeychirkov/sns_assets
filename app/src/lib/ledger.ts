import { Principal } from "@dfinity/principal";
import { IcrcLedgerCanister } from "@dfinity/ledger-icrc";
import type { HttpAgent } from "@dfinity/agent";

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
