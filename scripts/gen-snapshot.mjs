/**
 * Script to generate the SNS snapshot data.
 * Run: node scripts/gen-snapshot.mjs
 * Requires the library to be built first: npm run build
 * Output is piped to scripts/snapshot-raw.json:
 *   node scripts/gen-snapshot.mjs > scripts/snapshot-raw.json
 */
import { HttpAgent } from "@dfinity/agent";
import { fetchSnsProjects } from "../dist/index.js";

const HOST = "https://ic0.app";

async function main() {
  const agent = await HttpAgent.create({ host: HOST });

  process.stderr.write("Fetching project metadata...\n");
  const fetchedAt = Date.now();
  const projects = await fetchSnsProjects({
    agent,
    onProgress(p) {
      process.stderr.write(`  ${p.fetched}/${p.total}\r`);
    },
  });
  process.stderr.write(`\nFetched ${projects.length} projects\n`);

  const output = { fetchedAt, projects };
  process.stdout.write(JSON.stringify(output, null, 2));
  process.stderr.write("\nDone!\n");
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
