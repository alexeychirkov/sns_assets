import { Principal } from "@dfinity/principal";

/**
 * Tries to interpret `input` as a contract URL of the form:
 *   https://<canisterId>.icp0.io/...
 *   https://<canisterId>.ic0.app/...
 *
 * Returns the canister Principal if the pattern matches, otherwise null.
 * The ?ref=... query parameter is intentionally ignored.
 */
export function parseContractUrl(input: string): Principal | null {
  const trimmed = input.trim();

  // Must look like a URL
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Hostname examples:
  //   l42i3-xqaaa-aaaas-qeuwq-cai.icp0.io
  //   l42i3-xqaaa-aaaas-qeuwq-cai.ic0.app
  const match = url.hostname.match(/^([a-z0-9-]+)\.(icp0\.io|ic0\.app)$/i);
  if (!match) {
    return null;
  }

  const candidatePrincipal = match[1];
  try {
    return Principal.fromText(candidatePrincipal);
  } catch {
    return null;
  }
}
