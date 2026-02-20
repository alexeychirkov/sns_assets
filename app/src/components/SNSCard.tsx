import type { SnsProjectResult, SnsSource } from "../lib/types";
import { formatTokenAmount, formatDuration, shortenId } from "../lib/format";

const SOURCE_BADGE: Record<SnsSource, { label: string; cls: string }> = {
  canister: { label: "Канистра", cls: "badge-canister" },
  aggregator: { label: "Агрегатор", cls: "badge-aggregator" },
  both: { label: "Оба источника", cls: "badge-both" },
};

interface Props {
  result: SnsProjectResult;
}

const STATE_LABEL: Record<string, string> = {
  locked: "Locked",
  dissolving: "Dissolving",
  dissolved: "Dissolved",
};

const STATE_CLASS: Record<string, string> = {
  locked: "state-locked",
  dissolving: "state-dissolving",
  dissolved: "state-dissolved",
};

export function SNSCard({ result }: Props) {
  const { project, neurons, tokenBalance } = result;
  const hasBalance = tokenBalance > 0n;
  const hasNeurons = neurons.length > 0;

  return (
    <div className="sns-card">
      <div className="sns-card-header">
        {project.logo ? (
          <img
            className="sns-logo"
            src={project.logo}
            alt={project.name}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="sns-logo-placeholder">{project.name.charAt(0).toUpperCase()}</div>
        )}
        <div className="sns-card-title">
          <div className="sns-name-row">
            <h3 className="sns-name">{project.name}</h3>
            <span className={`source-badge ${SOURCE_BADGE[project.source].cls}`}>
              {SOURCE_BADGE[project.source].label}
            </span>
          </div>
          {project.url && (
            <a className="sns-url" href={project.url} target="_blank" rel="noopener noreferrer">
              {project.url.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {hasBalance && (
        <div className="asset-section">
          <div className="section-label">Токены</div>
          <div className="balance-row">
            <span className="balance-amount">
              {formatTokenAmount(tokenBalance, project.tokenDecimals)}
            </span>
            <span className="balance-symbol">{project.tokenSymbol}</span>
          </div>
        </div>
      )}

      {hasNeurons && (
        <div className="asset-section">
          <div className="section-label">Нейроны ({neurons.length})</div>
          <div className="neurons-list">
            {neurons.map((n) => (
              <div key={n.id} className="neuron-row">
                <div className="neuron-top">
                  <span className="neuron-id" title={n.id}>
                    #{shortenId(n.id)}
                  </span>
                  <span className={`neuron-state ${STATE_CLASS[n.state]}`}>
                    {STATE_LABEL[n.state]}
                  </span>
                </div>
                <div className="neuron-details">
                  <span className="neuron-detail">
                    <span className="detail-label">Стейк</span>
                    {formatTokenAmount(n.stakeE8s, project.tokenDecimals)} {project.tokenSymbol}
                  </span>
                  {n.dissolveDelaySeconds > 0n && (
                    <span className="neuron-detail">
                      <span className="detail-label">
                        {n.state === "dissolving" ? "Осталось" : "Задержка"}
                      </span>
                      {formatDuration(n.dissolveDelaySeconds)}
                    </span>
                  )}
                  {n.maturityE8s > 0n && (
                    <span className="neuron-detail">
                      <span className="detail-label">Maturity</span>
                      {formatTokenAmount(n.maturityE8s, project.tokenDecimals)}{" "}
                      {project.tokenSymbol}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
