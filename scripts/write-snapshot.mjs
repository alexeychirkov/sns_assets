import fs from "fs";

const data = JSON.parse(fs.readFileSync("scripts/snapshot-raw.json", "utf8"));
const lines = [];
lines.push(`import type { SnsProject } from "./types.js";`);
lines.push(``);
lines.push(`/**`);
lines.push(` * Static snapshot of all deployed SNS projects.`);
lines.push(` * Generated: ${new Date(data.fetchedAt).toISOString()}`);
lines.push(` * Total: ${data.projects.length} projects`);
lines.push(` */`);
lines.push(`export const SNS_SNAPSHOT_FETCHED_AT = ${data.fetchedAt}; // ${new Date(data.fetchedAt).toISOString()}`);
lines.push(``);
lines.push(`export const SNS_SNAPSHOT: SnsProject[] = [`);

for (const p of data.projects) {
  lines.push(`  {`);
  lines.push(`    name: ${JSON.stringify(p.name)},`);
  lines.push(`    rootCanisterId: ${JSON.stringify(p.rootCanisterId)},`);
  lines.push(`    governanceCanisterId: ${JSON.stringify(p.governanceCanisterId)},`);
  lines.push(`    ledgerCanisterId: ${JSON.stringify(p.ledgerCanisterId)},`);
  lines.push(`    tokenSymbol: ${JSON.stringify(p.tokenSymbol)},`);
  lines.push(`    tokenDecimals: ${p.tokenDecimals},`);
  if (p.logoDataUrl) {
    lines.push(`    logoDataUrl: ${JSON.stringify(p.logoDataUrl)},`);
  }
  lines.push(`  },`);
}

lines.push(`];`);
lines.push(``);
lines.push(`export function getSnapshotProjects(): SnsProject[] {`);
lines.push(`  return SNS_SNAPSHOT;`);
lines.push(`}`);
lines.push(``);

fs.writeFileSync("src/snapshot.ts", lines.join("\n"));
console.log(`Written src/snapshot.ts — ${fs.statSync("src/snapshot.ts").size} bytes, ${data.projects.length} projects`);
