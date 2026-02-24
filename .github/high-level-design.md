# High-Level Design: `sns-assets` Library

**Package:** `sns-assets` v0.1.0  
**Language:** TypeScript (ESM + CJS dual output)  
**Purpose:** Scan neuron stakes and token balances for a given principal across all deployed SNS projects on the Internet Computer (IC) network.

---

## 1. Overview

`sns-assets` is a TypeScript library that exposes a clean two-phase API:

1. **Fetch** — discover all live SNS projects and their metadata from the IC.
2. **Scan** — query a principal's neurons and token balances across those projects.

An optional **valuation** step enriches scan results with USD / ICP prices from the ICPSwap price feed.

The library is designed to be used in browsers, Node.js scripts, and any IC-aware frontend. All core types are fully JSON-serializable, enabling caching and offline workflows.

---

## 2. Module Map

```
src/
├── index.ts        — Public API surface; orchestrates Phase 1 + Phase 2
├── types.ts        — All TypeScript interfaces and enums (no runtime logic)
├── agent.ts        — Shared HttpAgent singleton factory
├── canister.ts     — Phase 1: fetches SNS list + ICRC-1 metadata from canisters
├── governance.ts   — Phase 2 (neurons): queries SnsGovernanceCanister
├── ledger.ts       — Phase 2 (balances): queries ICRC-1 ledger canister
├── prices.ts       — Fetches ICPSwap price feed → PriceMap
├── valuation.ts    — Pure valuation helpers (no network); annotates scan results
├── snapshot.ts     — Static snapshot of all SNS projects (bundled with library)
└── constants.ts    — EXCLUDED_PROJECTS list (root canister IDs to skip)
```

---

## 3. Two-Phase Design

The API is intentionally split into two independent phases to avoid redundant network calls when scanning multiple principals.

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1 — fetchSnsProjects()                                   │
│                                                                  │
│  SNS-WASM canister ──► list_deployed_snses                      │
│                    ──► ICRC-1 metadata (name, symbol, decimals) │
│                    ──► Governance logo (get_metadata)            │
│                                                                  │
│  Returns: SnsProject[]  (JSON-serializable, safe to cache)      │
└────────────────────────┬────────────────────────────────────────┘
                         │  pass projects once
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2 — scanPrincipal(principal, projects)                   │
│                                                                  │
│  For each project (concurrency=5 by default):                   │
│    ├── GovernanceCanister.listNeurons(principal)                 │
│    └── IcrcLedger.balance(principal)                            │
│                                                                  │
│  Returns: ScanResult { assets, failed }                         │
└─────────────────────────────────────────────────────────────────┘
```

This separation means:

- `fetchSnsProjects()` is called **once**, even when scanning many principals.
- `scanPrincipal()` can be called **N times** with the same project list.
- The project list can be **persisted** (e.g. to `localStorage`) and restored from JSON, skipping the fetch entirely on subsequent runs.

---

## 4. Data Flow

```
IC Network
│
├── SNS-WASM canister (qaa6y-5yaaa-aaaaa-aaafa-cai)
│     └─► list_deployed_snses  ──► canister.ts ──► SnsProject[]
│
├── Per-project Governance canister
│     └─► listNeurons(principal)  ──► governance.ts ──► SnsNeuronInfo[]
│
├── Per-project ICRC-1 Ledger canister
│     └─► icrc1_balance_of(principal)  ──► ledger.ts ──► bigint
│
└── ICPSwap REST API (https://api.icpswap.com/info/token/all)
      └─► prices.ts ──► PriceMap (ledgerId → USD price)

                              ▼
                         index.ts
                    (orchestration layer)
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
              ScanResult           applyValuation()
          { assets, failed }    (pure, no network)
                                         │
                                         ▼
                               SnsProjectAssets[]
                            with valuation?: ProjectValuation
```

---

## 5. Core Type System

### Project

```
SnsProject
  ├── name: string
  ├── rootCanisterId: string
  ├── governanceCanisterId: string
  ├── ledgerCanisterId: string
  ├── tokenSymbol?: string
  ├── tokenDecimals?: number
  └── logoDataUrl?: string
```

### Neuron

```
SnsNeuronInfo
  ├── id: string (hex)
  ├── state: "locked" | "dissolving" | "dissolved"
  ├── dissolveDelaySeconds: bigint
  ├── dissolveAt?: bigint (timestamp, only when dissolving)
  ├── votingPowerPercentageMultiplier: bigint
  ├── isSoleOwner: boolean  ← sole holder of ManagePrincipals permission
  ├── permissions: NeuronPermission[]
  ├── balance: NeuronBalance
  └── valuation?: NeuronValuation  ← populated by applyValuation()
```

### Balance hierarchy

```
NeuronBalance          (per neuron)
  ├── stakeE8s
  ├── maturityE8s
  ├── stakedMaturityE8s
  └── totalMaturityE8s

NeuronCumulative       (aggregate over N neurons)
  └── same fields as NeuronBalance (minus totalValue)

ProjectBalance         (per SNS project, per principal)
  ├── tokenBalance     (free wallet balance)
  ├── neuronsTotal     (cumulative over ALL neurons)
  ├── neuronsOwner     (cumulative over isSoleOwner neurons only)
  └── totalValue       (tokenBalance + neuronsOwner stake + maturity)

SnsProjectAssets       (top-level result per project)
  ├── project: SnsProject
  ├── neurons: SnsNeuronInfo[]
  ├── hasAssets: boolean
  ├── balance: ProjectBalance
  └── valuation?: ProjectValuation
```

---

## 6. Valuation Pipeline

The valuation step is **pure** (no network calls) and **optional**. It is applied after scanning.

```
fetchPriceMap()
  └── GET https://api.icpswap.com/info/token/all
  └── Returns: PriceMap  (Map<ledgerId, usdPrice: number>)

applyValuation(assets: SnsProjectAssets, priceMap: PriceMap)
  ├── Looks up ICP price  ← priceMap.get(ICP_LEDGER_ID)
  ├── Looks up token price ← priceMap.get(project.ledgerCanisterId)
  ├── If either is missing → returns original object unchanged
  └── Returns new SnsProjectAssets with:
        ├── neurons[i].valuation: NeuronValuation  { valueUsd, valueIcp }
        └── valuation: ProjectValuation            { tokenBalanceUsd/Icp,
                                                     neuronsValueUsd/Icp,
                                                     ownerNeuronsValueUsd/Icp,
                                                     totalValueUsd/Icp,
                                                     ownerValueUsd/Icp }
```

**Precision conventions:**

- USD amounts → `bigint` in **e6s** (1 USD = `1_000_000n`), matching USDC precision.
- ICP amounts → `bigint` in **e8s** (1 ICP = `100_000_000n`).

---

## 7. Snapshot System

The library ships a **pre-bundled static snapshot** of all SNS projects (`src/snapshot.ts`), allowing consumers to skip the Phase 1 network fetch entirely in production.

```
src/snapshot.ts          ← bundled with the library; updated by scripts/update-snapshot.mjs
snapshots/               ← versioned backups, not bundled
  snapshot-<datetime>.ts ← one file per update run
```

### Snapshot update workflow (`npm run update-snapshot`)

```
scripts/update-snapshot.mjs
  1. Copy src/snapshot.ts → snapshots/snapshot-<fetched_at_datetime>.ts
  2. fetchSnsProjects() via live IC network
  3. Save raw JSON → scripts/snapshot-raw.json
  4. Write new src/snapshot.ts
```

### `getSnapshotProjects()` usage pattern

Pass the snapshot as `knownProjects` to `fetchSnsProjects`. Only **new** projects not in the snapshot will trigger metadata network calls, drastically reducing fetch time.

```ts
import { fetchSnsProjects, getSnapshotProjects } from "sns-assets";

const projects = await fetchSnsProjects({
  knownProjects: getSnapshotProjects(),
});
```

---

## 8. Public API

### Functions

| Function                                       | Description                                     |
| ---------------------------------------------- | ----------------------------------------------- |
| `fetchSnsProjects(options?)`                   | Phase 1: fetch all SNS projects with metadata   |
| `scanPrincipal(principal, projects, options?)` | Phase 2: scan neurons + balances                |
| `scanSnsAssets(principal, options?)`           | Convenience: Phase 1 + Phase 2 in one call      |
| `fetchPriceMap()`                              | Fetch ICPSwap price feed → `PriceMap`           |
| `applyValuation(assets, priceMap)`             | Annotate scan result with USD/ICP values (pure) |
| `getSnapshotProjects()`                        | Return the bundled static snapshot              |
| `formatTokenAmount(amount, decimals)`          | Format bigint token amount to human string      |
| `formatDuration(seconds)`                      | Format dissolve delay bigint to human string    |

### Key Exports

| Export                    | Kind                                                |
| ------------------------- | --------------------------------------------------- |
| `EXCLUDED_PROJECTS`       | `string[]` of root canister IDs filtered by default |
| `SNS_SNAPSHOT`            | `SnsProject[]` static snapshot array                |
| `SNS_SNAPSHOT_FETCHED_AT` | `number` Unix ms timestamp of the snapshot          |
| `ICP_LEDGER_ID`           | Well-known ICP ledger canister ID                   |
| `NeuronPermissionType`    | Enum of all SNS neuron permission types             |
| `getNeuronPermissionName` | Map permission number → human string                |

### Options

**`FetchOptions`**

| Field              | Default             | Description                                     |
| ------------------ | ------------------- | ----------------------------------------------- |
| `host`             | `"https://icp0.io"` | IC HTTP gateway                                 |
| `onProgress`       | —                   | Progress callback during metadata fetch         |
| `knownProjects`    | —                   | Skip metadata fetch for known root canister IDs |
| `excludedProjects` | —                   | Root canister IDs to exclude from results       |

**`ScanOptions`**

| Field          | Default             | Description                                       |
| -------------- | ------------------- | ------------------------------------------------- |
| `host`         | `"https://icp0.io"` | IC HTTP gateway                                   |
| `concurrency`  | `5`                 | Max parallel canister queries                     |
| `onProgress`   | —                   | Progress callback per project scanned             |
| `includeEmpty` | `false`             | Include projects with zero balance and no neurons |

---

## 9. Key Design Decisions

### JSON-serializability of `SnsProject`

All fields in `SnsProject` are plain strings or optional strings/numbers. `bigint` values are intentionally absent, making the project list persisted to `localStorage`, `IndexedDB`, or a file without any custom serialization.

### `isSoleOwner` flag

A neuron is marked `isSoleOwner: true` when the scanned principal is the **only** holder of the `ManagePrincipals` permission. This distinguishes neurons the principal fully controls from neurons where the principal is merely a hotkey.

### `neuronsOwner` vs `neuronsTotal`

`ProjectBalance` separates cumulative neuron balances into:

- `neuronsTotal` — all neurons the principal can see
- `neuronsOwner` — only `isSoleOwner` neurons

This lets consumers display owned value vs. total visible value separately.

### Concurrency model

`scanPrincipal` uses a worker-pool pattern (default: 5 workers). Each worker pulls from a shared project queue, calling governance and ledger canisters in parallel via `Promise.allSettled`. Failures are collected in `ScanResult.failed` without aborting the scan.

### Graceful failure

`Promise.allSettled` is used for every per-project fetch. A failed governance or ledger call never stops the scan — the project is added to `failed[]` with `governanceFailed` / `ledgerFailed` flags and the error message.

### Metadata fetch optimization

When `knownProjects` is supplied, `canister.ts` only fetches ICRC-1 metadata and governance logos for **new** root canister IDs not already in the known list. This reduces a full fetch (≈38 network calls × 2) to near-zero for snapshot-seeded consumers.
