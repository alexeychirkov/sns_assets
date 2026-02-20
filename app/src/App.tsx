import { useState } from "react";
import type { Principal } from "@dfinity/principal";
import "./App.css";

import { fetchSnsProjects, scanPrincipal } from "sns-assets";
import type { SnsProjectAssets } from "sns-assets";

import type { ProjectCache } from "./lib/cache";
import { loadCache, saveCache, clearCache } from "./lib/cache";
import { CachePanel } from "./components/CachePanel";
import { PrincipalInput } from "./components/PrincipalInput";
import { ProgressPanel } from "./components/ProgressPanel";
import { SNSCard } from "./components/SNSCard";

type ScanPhase = "idle" | "scanning" | "done" | "error";

const CONCURRENCY = 5;

export function App() {
  // ─── SNS project list (shared, cached) ──────────────────────────────────
  const [cache, setCache] = useState<ProjectCache | null>(() => loadCache());
  const [listPhase, setListPhase] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");

  // ─── Per-principal scan ──────────────────────────────────────────────────
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [current, setCurrent] = useState("");
  const [results, setResults] = useState<SnsProjectAssets[]>([]);
  const [scanError, setScanError] = useState("");

  // ─── Load / refresh SNS list ─────────────────────────────────────────────
  async function handleLoadList() {
    setListPhase("loading");
    setListError("");
    try {
      const projects = await fetchSnsProjects();
      setCache(saveCache(projects));
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

    setScanPhase("scanning");
    setScanError("");
    setResults([]);
    setTotal(cache.projects.length);
    setScanned(0);
    setCurrent("");

    try {
      const assets = await scanPrincipal(principal, cache.projects, {
        concurrency: CONCURRENCY,
        onProgress(p) {
          if (p.phase === "scanning") {
            setScanned(p.scanned);
            setCurrent(p.current ?? "");
          }
        },
      });
      setResults(assets);
      setCurrent("");
      setScanPhase("done");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : String(err));
      setScanPhase("error");
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
