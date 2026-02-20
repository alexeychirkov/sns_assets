import { useState } from "react";
import type { ScanProjectError } from "sns-assets";

interface Props {
  failed: ScanProjectError[];
}

export function FailedProjectsPanel({ failed }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (failed.length === 0) return null;

  return (
    <div className="failed-panel">
      <button
        className="failed-panel-header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="failed-panel-icon">⚠</span>
        <span className="failed-panel-title">
          Could not verify data for {failed.length} project{failed.length === 1 ? "" : "s"}
        </span>
        <span className={`failed-panel-chevron${expanded ? " failed-panel-chevron--open" : ""}`}>›</span>
      </button>

      {expanded && (
        <ul className="failed-panel-list">
          {failed.map(({ project, governanceFailed, ledgerFailed }) => (
            <li key={project.rootCanisterId} className="failed-panel-item">
              <div className="failed-project-name">{project.name || project.rootCanisterId}</div>
              <div className="failed-project-reasons">
                {governanceFailed && (
                  <span className="failed-reason">
                    governance unavailable — neurons not checked
                  </span>
                )}
                {ledgerFailed && (
                  <span className="failed-reason">
                    ledger unavailable — token balance not checked
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
