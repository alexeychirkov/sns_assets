import { useState } from "react";
import type { SnsNeuronInfo, SnsProjectAssets } from "sns-assets";
import { formatDays, formatTokenAmount, formatUsdE6s } from "../lib/format";
import { NeuronModal } from "./NeuronModal";

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

function sortByValue(list: SnsNeuronInfo[]): SnsNeuronInfo[] {
  return [...list].sort((a, b) =>
    b.balance.totalValue > a.balance.totalValue
      ? 1
      : b.balance.totalValue < a.balance.totalValue
        ? -1
        : 0
  );
}

export function SNSCard({ result, showNonOwned, showEmpty }: Props) {
  const { project, neurons } = result;
  const decimals = project.tokenDecimals ?? 8;
  const symbol = project.tokenSymbol ?? "?";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cardOpen, setCardOpen] = useState(false);
  const [modalNeuron, setModalNeuron] = useState<SnsNeuronInfo | null>(null);

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

  function prepareNeurons(list: SnsNeuronInfo[]): SnsNeuronInfo[] {
    const filtered = showEmpty ? list : list.filter((n) => n.balance.totalValue > 0n);
    return sortByValue(filtered);
  }

  const mineNeurons = prepareNeurons(neurons.filter((n) => n.isSoleOwner));
  const sharedNeurons = showNonOwned ? prepareNeurons(neurons.filter((n) => !n.isSoleOwner)) : [];

  const hasBalance = result.balance.tokenBalance > 0n;
  const hasNeurons = mineNeurons.length > 0 || sharedNeurons.length > 0;
  const hasCumulativeData =
    result.balance.neuronsTotal.stakeE8s > 0n || result.balance.neuronsTotal.totalMaturityE8s > 0n;

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
          {
            <div className="card-total-value">
              {formatTokenAmount(result.balance.totalValue, decimals)}{" "}
              <span className="card-total-symbol">{symbol}</span>
            </div>
          }
          {result.valuation && (
            <div className="card-valuation">
              <span className="card-val-usd">{formatUsdE6s(result.valuation.ownerValueUsd)}</span>
              <span className="card-val-sep"> · </span>
              <span className="card-val-icp">
                {formatTokenAmount(result.valuation.ownerValueIcp, 8)} ICP
              </span>
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
              {formatTokenAmount(result.balance.tokenBalance, decimals)}
            </span>
            <span className="balance-symbol">{symbol}</span>
          </div>
          {result.valuation && result.valuation.tokenBalanceUsd > 0n && (
            <div className="price-secondary">
              {formatUsdE6s(result.valuation.tokenBalanceUsd)}
              <span className="price-sep"> · </span>
              {formatTokenAmount(result.valuation.tokenBalanceIcp, 8)} ICP
            </div>
          )}
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
              {result.balance.neuronsTotal.stakeE8s > 0n && (
                <tr>
                  <td className="cum-label">Stake</td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsTotal.stakeE8s, decimals)} {symbol}
                  </td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsOwner.stakeE8s, decimals)} {symbol}
                  </td>
                </tr>
              )}
              {result.balance.neuronsTotal.totalMaturityE8s > 0n && (
                <tr>
                  <td className="cum-label">Maturity</td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsTotal.totalMaturityE8s, decimals)}{" "}
                    {symbol}
                  </td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsOwner.totalMaturityE8s, decimals)}{" "}
                    {symbol}
                  </td>
                </tr>
              )}
              {result.balance.neuronsTotal.stakedMaturityE8s > 0n && (
                <tr>
                  <td className="cum-label">Stk.Mat.</td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsTotal.stakedMaturityE8s, decimals)}{" "}
                    {symbol}
                  </td>
                  <td>
                    {formatTokenAmount(result.balance.neuronsOwner.stakedMaturityE8s, decimals)}{" "}
                    {symbol}
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
                    onOpenModal={() => setModalNeuron(n)}
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
                    onOpenModal={() => setModalNeuron(n)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {modalNeuron && (
        <NeuronModal
          neuron={modalNeuron}
          symbol={symbol}
          decimals={decimals}
          onClose={() => setModalNeuron(null)}
        />
      )}
    </div>
  );
}

interface NeuronRowProps {
  neuron: SnsNeuronInfo;
  project: SnsProjectAssets["project"];
  expanded: boolean;
  onToggle: () => void;
  onOpenModal: () => void;
}

function NeuronRow({ neuron: n, project, expanded, onToggle, onOpenModal }: NeuronRowProps) {
  const decimals = project.tokenDecimals ?? 8;
  const symbol = project.tokenSymbol ?? "?";
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
          {formatTokenAmount(n.balance.totalValue, decimals)} {symbol}
          {n.valuation && (
            <span className="price-secondary"> {formatUsdE6s(n.valuation.valueUsd)}</span>
          )}
        </span>
        {n.dissolveDelaySeconds > 0n && (
          <span className="neuron-detail">
            <span className="detail-label">{n.state === "dissolving" ? "Remaining" : "Delay"}</span>
            {formatDays(n.dissolveDelaySeconds)}
          </span>
        )}
      </div>

      {/* Expanded view: stake + maturities */}
      {expanded && (
        <div className="neuron-details neuron-details-expanded">
          <span className="neuron-detail">
            <span className="detail-label">Stake</span>
            {formatTokenAmount(n.balance.stakeE8s, decimals)} {symbol}
          </span>
          {n.balance.totalMaturityE8s > 0n && (
            <span className="neuron-detail">
              <span className="detail-label">Total maturity</span>
              {formatTokenAmount(n.balance.totalMaturityE8s, decimals)} {symbol}
            </span>
          )}
          {n.balance.stakedMaturityE8s > 0n && (
            <span className="neuron-detail">
              <span className="detail-label">Staked maturity</span>
              {formatTokenAmount(n.balance.stakedMaturityE8s, decimals)} {symbol}
            </span>
          )}
        </div>
      )}

      <div className="neuron-more-row">
        {expanded && (
          <button className="more-btn neuron-details-btn" onClick={onOpenModal}>
            details
          </button>
        )}
        <button className="more-btn" onClick={onToggle}>
          {expanded ? "less" : "more"}
        </button>
      </div>
    </div>
  );
}
