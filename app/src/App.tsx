import { useRef, useState } from "react";
import type { Principal } from "@dfinity/principal";
import "./App.css";

import type { ScanPhase, SnsProjectResult } from "./lib/types";
import { fetchAllSnsProjects } from "./lib/aggregator";
import { getAgent } from "./lib/agent";
import { fetchNeurons } from "./lib/governance";
import { fetchTokenBalance } from "./lib/ledger";
import { PrincipalInput } from "./components/PrincipalInput";
import { ProgressPanel } from "./components/ProgressPanel";
import { SNSCard } from "./components/SNSCard";

const CONCURRENCY = 5;

export function App() {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [total, setTotal] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [current, setCurrent] = useState("");
  const [results, setResults] = useState<SnsProjectResult[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef(false);

  async function handleSearch(principal: Principal) {
    abortRef.current = false;
    setPhase("fetching-list");
    setResults([]);
    setError("");
    setTotal(0);
    setScanned(0);
    setCurrent("");

    let projects;
    try {
      projects = await fetchAllSnsProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
      return;
    }

    if (abortRef.current) return;

    setTotal(projects.length);
    setPhase("scanning");

    const agent = await getAgent();
    const queue = [...projects];
    // scanned counter shared across workers via closure + ref
    let doneCount = 0;

    async function worker() {
      while (queue.length > 0 && !abortRef.current) {
        const project = queue.shift()!;
        setCurrent(project.name);

        const [neurons, tokenBalance] = await Promise.all([
          fetchNeurons(project.governanceCanisterId, principal, agent).catch(
            () => []
          ),
          fetchTokenBalance(project.ledgerCanisterId, principal, agent).catch(
            () => 0n
          ),
        ]);

        const hasAssets = neurons.length > 0 || tokenBalance > 0n;

        if (hasAssets) {
          setResults((prev) => [
            ...prev,
            { project, neurons, tokenBalance, hasAssets },
          ]);
        }

        doneCount++;
        setScanned(doneCount);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, projects.length) }, worker)
    );

    if (!abortRef.current) {
      setCurrent("");
      setPhase("done");
    }
  }

  const isRunning = phase === "fetching-list" || phase === "scanning";

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">SNS Assets Scanner</h1>
        <p className="app-subtitle">
          Нейроны и токены во всех запущенных Dfinity SNS проектах
        </p>
      </header>

      <main className="app-main">
        <PrincipalInput onSearch={handleSearch} disabled={isRunning} />

        <ProgressPanel
          phase={phase}
          total={total}
          scanned={scanned}
          current={current}
          foundCount={results.length}
        />

        {error && <div className="global-error">{error}</div>}

        {results.length > 0 && (
          <section className="results-section">
            <h2 className="results-heading">
              Найдено в {results.length} проект
              {results.length === 1 ? "е" : results.length < 5 ? "ах" : "ах"}
            </h2>
            <div className="results-grid">
              {results.map((r) => (
                <SNSCard key={r.project.rootCanisterId} result={r} />
              ))}
            </div>
          </section>
        )}

        {phase === "done" && results.length === 0 && (
          <div className="empty-state">
            Нейронов и токенов не найдено ни в одном SNS проекте
          </div>
        )}
      </main>
    </div>
  );
}
