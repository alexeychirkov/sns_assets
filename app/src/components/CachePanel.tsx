import type { ProjectCache } from "../lib/cache";
import { cacheAgeMs, isCacheStale, CACHE_STALE_MS } from "../lib/cache";
import { formatAge } from "../lib/format";

interface Props {
  cache: ProjectCache | null;
  loadPhase: "idle" | "loading" | "error";
  loadError: string;
  onLoad: () => void;
  onClear: () => void;
  disabled: boolean;
}

export function CachePanel({ cache, loadPhase, loadError, onLoad, onClear, disabled }: Props) {
  const isLoading = loadPhase === "loading";
  const stale = cache ? isCacheStale(cache) : false;
  const age = cache ? cacheAgeMs(cache) : 0;

  return (
    <div className="cache-panel">
      <div className="cache-panel-header">
        <span className="cache-panel-title">SNS Проекты</span>

        {cache && (
          <div className="cache-meta">
            <span className={`cache-count${stale ? " cache-stale" : ""}`}>
              {cache.projects.length} проектов
            </span>
            <span className="cache-dot">·</span>
            <span className={`cache-age${stale ? " cache-stale" : ""}`}>
              {stale ? <>⚠ устарело ({formatAge(age)})</> : formatAge(age)}
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
                Загружаю…
              </>
            ) : cache ? (
              "Обновить список"
            ) : (
              "Загрузить список"
            )}
          </button>

          {cache && !isLoading && (
            <button
              className="cache-clear-btn"
              onClick={onClear}
              disabled={disabled}
              title="Очистить кэш"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {!cache && loadPhase === "idle" && (
        <p className="cache-hint">
          Загрузите список SNS проектов один раз — потом сканируйте любое количество принципалов без
          повторных запросов.{" "}
          <span className="cache-hint-ttl">Кэш действителен {CACHE_STALE_MS / 3600000} ч.</span>
        </p>
      )}

      {loadError && <div className="cache-error">{loadError}</div>}
    </div>
  );
}
