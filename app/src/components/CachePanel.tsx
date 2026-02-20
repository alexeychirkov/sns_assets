import type { ProjectCache } from "../lib/cache";
import { CACHE_STALE_MS, cacheAgeMs, isCacheStale } from "../lib/cache";
import { formatAge } from "../lib/format";

interface Props {
  cache: ProjectCache | null;
  loadPhase: "idle" | "loading" | "error";
  loadError: string;
  fetchFetched: number;
  fetchTotal: number;
  onLoad: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function CachePanel({ cache, loadPhase, loadError, fetchFetched, fetchTotal, onLoad, onClear, disabled }: Props) {
  const isLoading = loadPhase === "loading";
  const fetchPct = fetchTotal > 0 ? Math.round((fetchFetched / fetchTotal) * 100) : 0;
  const stale = cache ? isCacheStale(cache) : false;
  const age = cache ? cacheAgeMs(cache) : 0;

  return (
    <div className="cache-panel">
      <div className="cache-panel-header">
        <span className="cache-panel-title">SNS Projects</span>

        {cache && (
          <div className="cache-meta">
            <span className={`cache-count${stale ? " cache-stale" : ""}`}>
              {cache.projects.length} projects
            </span>
            <span className="cache-dot">·</span>
            <span className={`cache-age${stale ? " cache-stale" : ""}`}>
              {stale ? <>⚠ stale ({formatAge(age)})</> : formatAge(age)}
            </span>
          </div>
        )}
      </div>

      <div className="cache-controls">
        <div className="cache-buttons">
          <button className="cache-load-btn" onClick={onLoad} disabled={isLoading || disabled}>
            {isLoading ? (
              <>
                <span className="spinner" />
                Loading…
              </>
            ) : cache ? (
              "Refresh list"
            ) : (
              "Load list"
            )}
          </button>

          {cache && !isLoading && (
            <button
              className="cache-clear-btn"
              onClick={onClear}
              disabled={disabled}
              title="Clear cache"
            >
              ✕
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

      {!cache && loadPhase === "idle" && (
        <p className="cache-hint">
          Load the SNS project list once — then scan any number of principals without re-fetching.{" "}
          <span className="cache-hint-ttl">Cache is valid for {CACHE_STALE_MS / 3600000} h.</span>
        </p>
      )}

      {loadError && <div className="cache-error">{loadError}</div>}
    </div>
  );
}
