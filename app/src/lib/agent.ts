import { HttpAgent } from "@dfinity/agent";

let _agent: HttpAgent | undefined;

export async function getAgent(): Promise<HttpAgent> {
  if (_agent) return _agent;
  _agent = await HttpAgent.create({ host: "https://ic0.app" });
  return _agent;
}
