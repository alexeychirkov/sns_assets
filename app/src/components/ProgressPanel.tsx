type ScanPhase = "idle" | "scanning" | "done" | "error";

interface Props {
  phase: ScanPhase;
  total: number;
  scanned: number;
  current: string;
  foundCount: number;
}

export function ProgressPanel({ phase, total, scanned, current, foundCount }: Props) {
  if (phase === "idle") return null;

  const pct = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <div className="progress-panel">
      {(phase === "scanning" || phase === "done") && (
        <>
          <div className="progress-header">
            <span className="progress-label">
              {phase === "done" ? (
                <>
                  Done —{" "}
                  <span className="accent">found in {foundCount} project{foundCount === 1 ? "" : "s"}</span>
                </>
              ) : (
                <>
                  Checked{" "}
                  <span className="accent">
                    {scanned} / {total}
                  </span>{" "}
                  SNS projects
                </>
              )}
            </span>
            <span className="progress-pct">{pct}%</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>

          {phase === "scanning" && current && (
            <div className="progress-current">
              <span className="spinner" />
              {current}
            </div>
          )}
        </>
      )}

      {phase === "error" && <div className="progress-error">Failed to load SNS list</div>}
    </div>
  );
}
