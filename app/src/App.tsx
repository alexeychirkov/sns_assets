import { Principal } from "@dfinity/principal";
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

import type { ScanProjectError, SnsProjectAssets } from "sns-assets";
import { SNS_SNAPSHOT, SNS_SNAPSHOT_FETCHED_AT, applyValuation, fetchPriceMap, fetchSnsProjects, scanPrincipal } from "sns-assets";

import { CachePanel } from "./components/CachePanel";
import { FailedProjectsPanel } from "./components/FailedProjectsPanel";
import { PrincipalInput } from "./components/PrincipalInput";
import { ProgressPanel } from "./components/ProgressPanel";
import { SNSCard } from "./components/SNSCard";
import type { ProjectCache } from "./lib/cache";
import { appendProject, initFromSnapshot, markFetchComplete } from "./lib/cache";
import { formatIcpE8s, formatUsdE6s } from "./lib/format";

type ScanPhase = "idle" | "scanning" | "done" | "error";

const CONCURRENCY = 5;

const EXCLUDED_PROJECTS = [
    "w7g63-nqaaa-aaaaq-aabca-cai",
    "23ten-uaaaa-aaaaq-aaapa-cai",
    "55uwu-byaaa-aaaaq-aaa7q-cai",
    "v2sfq-qyaaa-aaaaq-aabjq-cai",
    "shqlm-7yaaa-aaaaq-aab3q-cai",
    "5psbn-niaaa-aaaaq-aaa4q-cai",
    "s4vxj-faaaa-aaaaq-aabza-cai",
    "6kg2g-qaaaa-aaaaq-aaaxa-cai",
    "bxmkl-2iaaa-aaaaq-aac6q-cai",
    "mctoc-3qaaa-aaaaq-aadwa-cai",
    "pnthx-iiaaa-aaaaq-aaeba-cai",
    "pvbcq-kiaaa-aaaaq-aad6q-cai",
    "ibahq-taaaa-aaaaq-aadna-cai",
    "nllv2-byaaa-aaaaq-aaema-cai",
    "u67kc-jyaaa-aaaaq-aabpq-cai"
];

function getPathPrincipal(): string | null {
  const m = window.location.pathname.match(/^\/principal\/(.+)$/);
  return m ? m[1] : null;
}

function pushPrincipalPath(text: string) {
  window.history.pushState({}, "", `/principal/${text}`);
}

export function App() {
  // ─── SNS project list (shared, cached) ──────────────────────────────────
  // Initialize from snapshot immediately so the app is usable without any network call
  const [cache, setCache] = useState<ProjectCache>(() =>
    initFromSnapshot(SNS_SNAPSHOT, SNS_SNAPSHOT_FETCHED_AT)
  );
  const cacheRef = useRef<ProjectCache>(cache);
  cacheRef.current = cache;

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
  const [failedProjects, setFailedProjects] = useState<ScanProjectError[]>([]);
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
      await fetchSnsProjects({
        knownProjects: cacheRef.current.projects,
        excludedProjects: EXCLUDED_PROJECTS,
        onProgress(p) {
          setFetchTotal(p.total);
          setFetchFetched((prev) => Math.max(prev, p.fetched));

          if (p.project) {
            const updated = appendProject(p.project, cacheRef.current);
            if (updated !== cacheRef.current) {
              cacheRef.current = updated;
              setCache(updated);
            }
          }
        },
      });
      const completed = markFetchComplete(cacheRef.current);
      cacheRef.current = completed;
      setCache(completed);
      setListPhase("idle");
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
      setListPhase("error");
    }
  }

  function handleClearCache() {
    const fresh = initFromSnapshot(SNS_SNAPSHOT, SNS_SNAPSHOT_FETCHED_AT);
    cacheRef.current = fresh;
    setCache(fresh);
    setListPhase("idle");
    setListError("");
  }

  // ─── Scan a principal against the cached list ────────────────────────────
  const handleSearch = useCallback(
    async (principal: Principal) => {
      pushPrincipalPath(principal.toText());

      setScanPhase("scanning");
      setScanError("");
      setResults([]);
      setFailedProjects([]);

      // Scan all projects
      const launched = cacheRef.current.projects;
      setTotal(launched.length);
      setScanned(0);
      setCurrent("");

      try {
        const [{ assets, failed }, priceMap] = await Promise.all([
          scanPrincipal(principal, launched, {
            concurrency: CONCURRENCY,
            onProgress(p) {
              if (p.phase === "scanning") {
                setScanned((prev) => Math.max(prev, p.scanned));
                setCurrent(p.current ?? "");
              }
            },
          }),
          fetchPriceMap().catch(() => null),
        ]);
        console.log(`SNS: Scan complete: ${assets.length} assets found, ${failed.length} failures.`, {priceMap});
        const enriched = priceMap
          ? assets.map((a) => applyValuation(a, priceMap))
          : assets;
        setResults(enriched);
        setFailedProjects(failed);
        setCurrent("");
        setScanPhase("done");
      } catch (err) {
        setScanError(err instanceof Error ? err.message : String(err));
        setScanPhase("error");
      }
    },
    [] // uses cacheRef so no stale closure issue
  );

  // ─── Auto-fetch SNS list on mount, then auto-scan from URL ──────────────
  useEffect(() => {
    async function init() {
      await handleLoadList();
      const text = getPathPrincipal();
      if (!text) return;
      try {
        handleSearch(Principal.fromText(text));
      } catch {
        // invalid principal in URL — ignore
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount

  const isScanning = scanPhase === "scanning";
  const isBusy = isScanning || listPhase === "loading";
  const showResults = results.length > 0;
  const showFilterBar = showResults || scanPhase === "done";

  const hasValuation = results.some((r) => r.valuation !== undefined);
  const totalPortfolioUsd = results.reduce(
    (acc, r) => acc + (r.valuation?.ownerValueUsd ?? 0n),
    0n
  );
  const totalPortfolioIcp = results.reduce(
    (acc, r) => acc + (r.valuation?.ownerValueIcp ?? 0n),
    0n
  );

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
          onReset={handleClearCache}
          disabled={isScanning}
        />

        {/* Step 2 — scan any principal against the cached list */}
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

        {failedProjects.length > 0 && <FailedProjectsPanel failed={failedProjects} />}

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
            {hasValuation && (
              <div className="portfolio-summary">
                <span className="portfolio-label">Portfolio (owned)</span>
                <span className="portfolio-usd">{formatUsdE6s(totalPortfolioUsd)}</span>
                <span className="portfolio-sep">·</span>
                <span className="portfolio-icp">{formatIcpE8s(totalPortfolioIcp)}</span>
              </div>
            )}
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
      </main>
    </div>
  );
}
