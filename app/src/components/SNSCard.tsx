import { useState } from "react";
import type { SnsNeuronInfo, SnsProjectAssets } from "sns-assets";
import { formatDays, formatTokenAmount } from "../lib/format";

interface Props {
  result: SnsProjectAssets;
  showNonOwned: boolean;
  showEmpty: boolean;
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

type NeuronWithValue = SnsNeuronInfo & { totalValue: bigint };

function sortByValue(list: NeuronWithValue[]): NeuronWithValue[] {
  return [...list].sort((a, b) =>
    b.totalValue > a.totalValue ? 1 : b.totalValue < a.totalValue ? -1 : 0
  );
}

export function SNSCard({ result, showNonOwned, showEmpty }: Props) {
  const { project, neurons, tokenBalance, cumulative, totalValue } = result;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cardOpen, setCardOpen] = useState(true);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function prepareNeurons(list: SnsNeuronInfo[]): NeuronWithValue[] {
    const withValue = list.map((n) => ({
      ...n,
      totalValue: n.stakeE8s + n.totalMaturityE8s,
    }));
    const filtered = showEmpty ? withValue : withValue.filter((n) => n.totalValue > 0n);
    return sortByValue(filtered);
  }

  const mineNeurons = prepareNeurons(neurons.filter((n) => n.isSoleOwner));
  const sharedNeurons = showNonOwned
    ? prepareNeurons(neurons.filter((n) => !n.isSoleOwner))
    : [];

  const hasBalance = tokenBalance > 0n;
  const hasNeurons = mineNeurons.length > 0 || sharedNeurons.length > 0;
  const hasCumulativeData =
    cumulative.total.stakeE8s > 0n || cumulative.total.totalMaturityE8s > 0n;

  const ownedCount = neurons.filter((n) => n.isSoleOwner).length;

  return (
    <div className="sns-card">
      <button className="sns-card-header" onClick={() => setCardOpen((o) => !o)}>
        <div className="sns-logo-placeholder">
          {project.logoDataUrl ? (
            <img src={project.logoDataUrl} alt={project.name} className="sns-logo-img" />
          ) : (
            project.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="sns-card-title">
          <h3 className="sns-name">{project.name}</h3>
          {totalValue > 0n && (
            <div className="card-total-value">
              {formatTokenAmount(totalValue, project.tokenDecimals)}{" "}
              <span className="card-total-symbol">{project.tokenSymbol}</span>
            </div>
          )}
        </div>
        <span className={`sns-card-chevron${cardOpen ? " sns-card-chevron--open" : ""}`}>›</span>
      </button>

      {cardOpen && hasBalance && (
        <div className="asset-section">
          <div className="section-label">Tokens</div>
          <div className="balance-row">
            <span className="balance-amount">
              {formatTokenAmount(tokenBalance, project.tokenDecimals)}
            </span>
            <span className="balance-symbol">{project.tokenSymbol}</span>
          </div>
        </div>
      )}

      {cardOpen && hasCumulativeData && (
        <div className="asset-section">
          <div className="section-label">Neuron summary</div>
          <table className="cumulative-table">
            <thead>
              <tr>
                <th></th>
                <th>Total</th>
                <th>Owned</th>
              </tr>
            </thead>
            <tbody>
              {cumulative.total.stakeE8s > 0n && (
                <tr>
                  <td className="cum-label">Stake</td>
                  <td>
                    {formatTokenAmount(cumulative.total.stakeE8s, project.tokenDecimals)}{" "}
                    {project.tokenSymbol}
                  </td>
                  <td>
                    {formatTokenAmount(cumulative.owner.stakeE8s, project.tokenDecimals)}{" "}
                    {project.tokenSymbol}
                  </td>
                </tr>
              )}
              {cumulative.total.totalMaturityE8s > 0n && (
                <tr>
                  <td className="cum-label">Maturity</td>
                  <td>
                    {formatTokenAmount(cumulative.total.totalMaturityE8s, project.tokenDecimals)}{" "}
                    {project.tokenSymbol}
                  </td>
                  <td>
                    {formatTokenAmount(cumulative.owner.totalMaturityE8s, project.tokenDecimals)}{" "}
                    {project.tokenSymbol}
                  </td>
                </tr>
              )}
              {cumulative.total.stakedMaturityE8s > 0n && (
                <tr>
                  <td className="cum-label">Stk.Mat.</td>
                  <td>
                    {formatTokenAmount(
                      cumulative.total.stakedMaturityE8s,
                      project.tokenDecimals
                    )}{" "}
                    {project.tokenSymbol}
                  </td>
                  <td>
                    {formatTokenAmount(
                      cumulative.owner.stakedMaturityE8s,
                      project.tokenDecimals
                    )}{" "}
                    {project.tokenSymbol}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {cardOpen && hasNeurons && (
        <div className="asset-section">
          <div className="section-label">
            Neurons
            <span className="neuron-counter">
              {" "}
              (owned: {ownedCount} / total: {neurons.length})
            </span>
          </div>

          {mineNeurons.length > 0 && (
            <div className="neuron-subsection">
              <div className="neuron-subsection-label">Mine ({mineNeurons.length})</div>
              <div className="neurons-list">
                {mineNeurons.map((n) => (
                  <NeuronRow
                    key={n.id}
                    neuron={n}
                    project={project}
                    expanded={expanded.has(n.id)}
                    onToggle={() => toggleExpanded(n.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {sharedNeurons.length > 0 && (
            <div className="neuron-subsection neuron-subsection--shared">
              <div className="neuron-subsection-label">Shared ({sharedNeurons.length})</div>
              <div className="neurons-list">
                {sharedNeurons.map((n) => (
                  <NeuronRow
                    key={n.id}
                    neuron={n}
                    project={project}
                    expanded={expanded.has(n.id)}
                    onToggle={() => toggleExpanded(n.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface NeuronRowProps {
  neuron: NeuronWithValue;
  project: SnsProjectAssets["project"];
  expanded: boolean;
  onToggle: () => void;
}

function NeuronRow({ neuron: n, project, expanded, onToggle }: NeuronRowProps) {
  return (
    <div className="neuron-row">
      <div className="neuron-top">
        <span className="neuron-id" title={n.id}>
          #{n.id}
        </span>
        <div className="neuron-badges">
          <span className={`neuron-state ${STATE_CLASS[n.state]}`}>{STATE_LABEL[n.state]}</span>
        </div>
      </div>

      {/* Default view: totalValue + dissolve delay */}
      <div className="neuron-details">
        <span className="neuron-detail">
          <span className="detail-label">Total value</span>
          {formatTokenAmount(n.totalValue, project.tokenDecimals)} {project.tokenSymbol}
        </span>
        {n.dissolveDelaySeconds > 0n && (
          <span className="neuron-detail">
            <span className="detail-label">
              {n.state === "dissolving" ? "Remaining" : "Delay"}
            </span>
            {formatDays(n.dissolveDelaySeconds)}
          </span>
        )}
      </div>

      {/* Expanded view: stake + maturities */}
      {expanded && (
        <div className="neuron-details neuron-details-expanded">
          <span className="neuron-detail">
            <span className="detail-label">Stake</span>
            {formatTokenAmount(n.stakeE8s, project.tokenDecimals)} {project.tokenSymbol}
          </span>
          {n.totalMaturityE8s > 0n && (
            <span className="neuron-detail">
              <span className="detail-label">Total maturity</span>
              {formatTokenAmount(n.totalMaturityE8s, project.tokenDecimals)} {project.tokenSymbol}
            </span>
          )}
          {n.stakedMaturityE8s > 0n && (
            <span className="neuron-detail">
              <span className="detail-label">Staked maturity</span>
              {formatTokenAmount(n.stakedMaturityE8s, project.tokenDecimals)} {project.tokenSymbol}
            </span>
          )}
        </div>
      )}

      <div className="neuron-more-row">
        <button className="more-btn" onClick={onToggle}>
          {expanded ? "less" : "more"}
        </button>
      </div>
    </div>
  );
}
