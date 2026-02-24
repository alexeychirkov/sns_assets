/**
 * Updates src/snapshot.ts with fresh data from the IC network.
 *
 * Steps:
 *   1. Back up the current src/snapshot.ts to src/snapshots/snapshot-<datetime>.ts
 *   2. Fetch all SNS projects (excluding EXCLUDED_PROJECTS)
 *   3. Save raw data to scripts/snapshot-raw.json
 *   4. Write the new src/snapshot.ts
 *
 * Usage:
 *   node scripts/update-snapshot.mjs
 *
 * Requirements:
 *   Build the library first: npm run build
 */

import { HttpAgent } from "@dfinity/agent";
import fs from "fs";
import path from "path";
import { EXCLUDED_PROJECTS, fetchSnsProjects } from "../dist/index.js";

const ROOT = new URL("..", import.meta.url).pathname;
const SNAPSHOT_SRC = path.join(ROOT, "src/snapshot.ts");
const SNAPSHOTS_DIR = path.join(ROOT, "src/snapshots");
const SNAPSHOT_RAW = path.join(ROOT, "scripts/snapshot-raw.json");
const HOST = "https://ic0.app";

// ─── Step 1: Backup current snapshot ────────────────────────────────────────

function backupCurrentSnapshot() {
  if (!fs.existsSync(SNAPSHOT_SRC)) {
    process.stderr.write("No existing snapshot to back up, skipping.\n");
    return;
  }

  const content = fs.readFileSync(SNAPSHOT_SRC, "utf8");
  const match = content.match(/SNS_SNAPSHOT_FETCHED_AT\s*=\s*(\d+)/);
  if (!match) {
    process.stderr.write(
      "Warning: could not find SNS_SNAPSHOT_FETCHED_AT in snapshot.ts, skipping backup.\n"
    );
    return;
  }

  const fetchedAt = parseInt(match[1], 10);
  const d = new Date(fetchedAt);
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp =
    [d.getUTCFullYear(), pad(d.getUTCMonth() + 1), pad(d.getUTCDate())].join("-") +
    "T" +
    [pad(d.getUTCHours()), pad(d.getUTCMinutes()), pad(d.getUTCSeconds())].join("-");

  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const backupPath = path.join(SNAPSHOTS_DIR, `snapshot-${timestamp}.ts`);
  fs.copyFileSync(SNAPSHOT_SRC, backupPath);
  process.stderr.write(`Backed up to src/snapshots/snapshot-${timestamp}.ts\n`);
}

// ─── Step 2: Fetch projects ──────────────────────────────────────────────────

async function fetchProjects() {
  const agent = await HttpAgent.create({ host: HOST });

  process.stderr.write(
    `Fetching SNS projects (excluding ${EXCLUDED_PROJECTS.length} projects)...\n`
  );
  const fetchedAt = Date.now();
  const projects = await fetchSnsProjects({
    agent,
    excludedProjects: EXCLUDED_PROJECTS,
    onProgress(p) {
      process.stderr.write(`  ${p.fetched}/${p.total}\r`);
    },
  });
  process.stderr.write(`\nFetched ${projects.length} projects\n`);

  return { fetchedAt, projects };
}

// ─── Step 3: Save raw JSON ───────────────────────────────────────────────────

function saveRaw(data) {
  fs.writeFileSync(SNAPSHOT_RAW, JSON.stringify(data, null, 2));
  process.stderr.write(`Saved scripts/snapshot-raw.json\n`);
}

// ─── Step 4: Write snapshot.ts ──────────────────────────────────────────────

function writeSnapshot(data) {
  const { fetchedAt, projects } = data;
  const lines = [];
  lines.push(`import type { SnsProject } from "./types.js";`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * Static snapshot of all deployed SNS projects.`);
  lines.push(` * Generated: ${new Date(fetchedAt).toISOString()}`);
  lines.push(` * Total: ${projects.length} projects`);
  lines.push(` */`);
  lines.push(
    `export const SNS_SNAPSHOT_FETCHED_AT = ${fetchedAt}; // ${new Date(fetchedAt).toISOString()}`
  );
  lines.push(``);
  lines.push(`export const SNS_SNAPSHOT: SnsProject[] = [`);

  const sorted = [...projects].sort((a, b) => a.rootCanisterId.localeCompare(b.rootCanisterId));

  for (const p of sorted) {
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

  fs.writeFileSync(SNAPSHOT_SRC, lines.join("\n"));
  process.stderr.write(
    `Written src/snapshot.ts — ${fs.statSync(SNAPSHOT_SRC).size} bytes, ${projects.length} projects\n`
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  backupCurrentSnapshot();
  const data = await fetchProjects();
  saveRaw(data);
  writeSnapshot(data);
  process.stderr.write("Done!\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
