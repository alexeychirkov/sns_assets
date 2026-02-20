import { HttpAgent } from "@dfinity/agent";

let _agent: HttpAgent | undefined;
let _agentHost: string | undefined;

/**
 * Returns a shared read-only HttpAgent for mainnet queries.
 * Reuses the same instance if the host hasn't changed.
 */
export async function getAgent(host: string): Promise<HttpAgent> {
  if (_agent && _agentHost === host) return _agent;

  _agent = await HttpAgent.create({ host });
  _agentHost = host;

  return _agent;
}
