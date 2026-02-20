import { Principal } from "@dfinity/principal";
import { useCallback, useEffect, useState } from "react";
import "./App.css";

import type { SnsProjectAssets } from "sns-assets";
import { fetchSnsProjects, scanPrincipal } from "sns-assets";

import { CachePanel } from "./components/CachePanel";
import { PrincipalInput } from "./components/PrincipalInput";
import { ProgressPanel } from "./components/ProgressPanel";
import { SNSCard } from "./components/SNSCard";
import type { ProjectCache } from "./lib/cache";
import { clearCache, loadCache, saveCache } from "./lib/cache";

type ScanPhase = "idle" | "scanning" | "done" | "error";

const CONCURRENCY = 5;

function getPathPrincipal(): string | null {
  const m = window.location.pathname.match(/^\/principal\/(.+)$/);
  return m ? m[1] : null;
}

function pushPrincipalPath(text: string) {
  window.history.pushState({}, "", `/principal/${text}`);
}

export function App() {
  // ─── SNS project list (shared, cached) ──────────────────────────────────
  const [cache, setCache] = useState<ProjectCache | null>(() => loadCache());
  const [listPhase, setListPhase] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [fetchFetched, setFetchFetched] = useState(0);
  const [fetchTotal, setFetchTotal] = useState(0);

  // ─── Per-principal scan ──────────────────────────────────────────────────
  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [current, setCurrent] = useState("");
  const [results, setResults] = useState<SnsProjectAssets[]>([]);
  const [scanError, setScanError] = useState("");

  // ─── Global filters ──────────────────────────────────────────────────────
  const [showNonOwned, setShowNonOwned] = useState(false);
  const [showEmpty, setShowEmpty] = useState(false);

  // ─── Load / refresh SNS list ─────────────────────────────────────────────
  async function handleLoadList() {
    setListPhase("loading");
    setListError("");
    setFetchFetched(0);
    setFetchTotal(0);
    try {
      const projects = await fetchSnsProjects({
        onProgress(p) {
          setFetchTotal(p.total);
          setFetchFetched((prev) => Math.max(prev, p.fetched));
        },
      });
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
  const handleSearch = useCallback(
    async (principal: Principal) => {
      if (!cache) return;

      pushPrincipalPath(principal.toText());

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
              setScanned((prev) => Math.max(prev, p.scanned));
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
    },
    [cache]
  );

  // ─── Auto-scan from URL on mount ─────────────────────────────────────────
  useEffect(() => {
    const text = getPathPrincipal();
    if (!text || !cache) return;
    try {
      const principal = Principal.fromText(text);
      handleSearch(principal);
    } catch {
      // invalid principal in URL — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount; cache is read from closure at mount time

  const isScanning = scanPhase === "scanning";
  const isBusy = isScanning || listPhase === "loading";
  const showResults = results.length > 0;
  const showFilterBar = showResults || scanPhase === "done";

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SNS Assets Scanner</h1>
        <p className="app-subtitle">Neurons and tokens across all deployed Dfinity SNS projects</p>
      </header>

      <main className="app-main">
        {/* Step 1 — load the SNS project list once */}
        <CachePanel
          cache={cache}
          loadPhase={listPhase}
          loadError={listError}
          fetchFetched={fetchFetched}
          fetchTotal={fetchTotal}
          onLoad={handleLoadList}
          onClear={handleClearCache}
          disabled={isScanning}
        />

        {/* Step 2 — scan any principal against the cached list */}
        {cache && (
          <>
            <PrincipalInput
              onSearch={handleSearch}
              disabled={isBusy}
              initialValue={getPathPrincipal() ?? ""}
            />

            <ProgressPanel
              phase={scanPhase}
              total={total}
              scanned={scanned}
              current={current}
              foundCount={results.length}
            />

            {scanError && <div className="global-error">{scanError}</div>}

            {showFilterBar && (
              <div className="filter-bar">
                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={showNonOwned}
                    onChange={(e) => setShowNonOwned(e.target.checked)}
                  />
                  Show non-owned neurons
                </label>
                <label className="filter-label">
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(e) => setShowEmpty(e.target.checked)}
                  />
                  Show empty neurons
                </label>
              </div>
            )}

            {showResults && (
              <section className="results-section">
                <h2 className="results-heading">
                  Found in {results.length} project{results.length === 1 ? "" : "s"}
                </h2>
                <div className="results-grid">
                  {results.map((r) => (
                    <SNSCard
                      key={r.project.rootCanisterId}
                      result={r}
                      showNonOwned={showNonOwned}
                      showEmpty={showEmpty}
                    />
                  ))}
                </div>
              </section>
            )}

            {scanPhase === "done" && results.length === 0 && (
              <div className="empty-state">No neurons or tokens found in any SNS project</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
