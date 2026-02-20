import { useRef, useState } from "react";
import type { Principal } from "@dfinity/principal";
import "./App.css";

import type { ScanPhase, SourceMode, SnsProjectResult } from "./lib/types";
import type { ProjectCache } from "./lib/cache";
import { loadCache, saveCache, clearCache } from "./lib/cache";
import { fetchSnsProjects } from "./lib/sources";
import { getAgent } from "./lib/agent";
import { fetchNeurons } from "./lib/governance";
import { fetchTokenBalance } from "./lib/ledger";
import { CachePanel } from "./components/CachePanel";
import { PrincipalInput } from "./components/PrincipalInput";
import { ProgressPanel } from "./components/ProgressPanel";
import { SNSCard } from "./components/SNSCard";

const CONCURRENCY = 5;

export function App() {
  // ─── SNS project list (shared, cached) ──────────────────────────────────
  const [cache, setCache] = useState<ProjectCache | null>(() => loadCache());
  const [listPhase, setListPhase] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [sourceMode, setSourceMode] = useState<SourceMode>("both");

  // ─── Per-principal scan ──────────────────────────────────────────────────
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [current, setCurrent] = useState("");
  const [results, setResults] = useState<SnsProjectResult[]>([]);
  const [scanError, setScanError] = useState("");
  const abortRef = useRef(false);

  // ─── Load / refresh SNS list ─────────────────────────────────────────────
  async function handleLoadList() {
    setListPhase("loading");
    setListError("");
    try {
      const agent = await getAgent();
      const projects = await fetchSnsProjects(sourceMode, agent);
      setCache(saveCache(projects, sourceMode));
      setListPhase("idle");
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
      setListPhase("error");
    }
  }

  function handleClearCache() {
    clearCache();
    setCache(null);
    setListPhase("idle");
    setListError("");
  }

  // ─── Scan a principal against the cached list ────────────────────────────
  async function handleSearch(principal: Principal) {
    if (!cache) return;

    abortRef.current = false;
    setScanPhase("scanning");
    setScanError("");
    setResults([]);
    setTotal(cache.projects.length);
    setScanned(0);
    setCurrent("");

    const agent = await getAgent();
    const queue = [...cache.projects];
    let doneCount = 0;

    async function worker() {
      while (queue.length > 0 && !abortRef.current) {
        const project = queue.shift()!;
        setCurrent(project.name);

        const [neurons, tokenBalance] = await Promise.all([
          fetchNeurons(project.governanceCanisterId, principal, agent).catch(() => []),
          fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(() => 0n),
        ]);

        const hasAssets = neurons.length > 0 || tokenBalance > 0n;
        if (hasAssets) {
          setResults((prev) => [...prev, { project, neurons, tokenBalance, hasAssets }]);
        }

        doneCount++;
        setScanned(doneCount);
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cache.projects.length) }, worker));

    if (!abortRef.current) {
      setCurrent("");
      setScanPhase("done");
    }
  }

  const isScanning = scanPhase === "scanning";
  const isBusy = isScanning || listPhase === "loading";

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SNS Assets Scanner</h1>
        <p className="app-subtitle">Нейроны и токены во всех запущенных Dfinity SNS проектах</p>
      </header>

      <main className="app-main">
        {/* Step 1 — load the SNS project list once */}
        <CachePanel
          cache={cache}
          loadPhase={listPhase}
          loadError={listError}
          sourceMode={sourceMode}
          onSourceChange={setSourceMode}
          onLoad={handleLoadList}
          onClear={handleClearCache}
          disabled={isScanning}
        />

        {/* Step 2 — scan any principal against the cached list */}
        {cache && (
          <>
            <PrincipalInput onSearch={handleSearch} disabled={isBusy} />

            <ProgressPanel
              phase={scanPhase}
              total={total}
              scanned={scanned}
              current={current}
              foundCount={results.length}
            />

            {scanError && <div className="global-error">{scanError}</div>}

            {results.length > 0 && (
              <section className="results-section">
                <h2 className="results-heading">
                  Найдено в {results.length} проект
                  {results.length === 1 ? "е" : "ах"}
                </h2>
                <div className="results-grid">
                  {results.map((r) => (
                    <SNSCard key={r.project.rootCanisterId} result={r} />
                  ))}
                </div>
              </section>
            )}

            {scanPhase === "done" && results.length === 0 && (
              <div className="empty-state">
                Нейронов и токенов не найдено ни в одном SNS проекте
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
