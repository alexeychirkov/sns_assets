import type { ProjectCache } from "../lib/cache";
import { cacheAgeMs, isCacheStale } from "../lib/cache";
import { formatAge } from "../lib/format";

interface Props {
  cache: ProjectCache;
  loadPhase: "idle" | "loading" | "error";
  loadError: string;
  fetchFetched: number;
  fetchTotal: number;
  onLoad: () => void;
  onReset: () => void;
  disabled: boolean;
}

export function CachePanel({
  cache,
  loadPhase,
  loadError,
  fetchFetched,
  fetchTotal,
  onLoad,
  onReset,
  disabled,
}: Props) {
  const isLoading = loadPhase === "loading";
  const fetchPct = fetchTotal > 0 ? Math.round((fetchFetched / fetchTotal) * 100) : 0;
  const stale = isCacheStale(cache);
  const age = cacheAgeMs(cache);

  return (
    <div className="cache-panel">
      <div className="cache-panel-header">
        <span className="cache-panel-title">SNS Projects</span>

        <div className="cache-meta">
          <span className={`cache-count${stale ? " cache-stale" : ""}`}>
            {cache.projects.length} projects
          </span>
          <span className="cache-dot">·</span>
          <span className={`cache-age${stale ? " cache-stale" : ""}`}>
            {stale ? <>⚠ stale ({formatAge(age)})</> : formatAge(age)}
          </span>
        </div>
      </div>

      <div className="cache-controls">
        <div className="cache-buttons">
          <button className="cache-load-btn" onClick={onLoad} disabled={isLoading || disabled}>
            {isLoading ? (
              <>
                <span className="spinner" />
                Loading…
              </>
            ) : stale ? (
              "Refresh list"
            ) : (
              "Fetch latest"
            )}
          </button>

          {!isLoading && (
            <button
              className="cache-clear-btn"
              onClick={onReset}
              disabled={disabled}
              title="Reset to built-in snapshot"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {isLoading && fetchTotal > 0 && (
        <div className="fetch-progress">
          <div className="progress-header">
            <span className="progress-label">
              Fetching{" "}
              <span className="accent">
                {fetchFetched} / {fetchTotal}
              </span>{" "}
              projects
            </span>
            <span className="progress-pct">{fetchPct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${fetchPct}%` }} />
          </div>
        </div>
      )}

      {!stale && loadPhase === "idle" && (
        <p className="cache-hint">
          Project list is loaded from a built-in snapshot. Press <strong>Fetch latest</strong> to
          pull the current list from the IC network.
        </p>
      )}

      {loadError && <div className="cache-error">{loadError}</div>}
    </div>
  );
}
