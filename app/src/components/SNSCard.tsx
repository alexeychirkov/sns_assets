import type { SnsProjectAssets } from "sns-assets";
import { NeuronPermissionType } from "sns-assets";
import { formatDays, formatTokenAmount } from "../lib/format";

interface Props {
  result: SnsProjectAssets;
  scannedPrincipal: string;
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

export function SNSCard({ result, scannedPrincipal }: Props) {
  const { project, neurons, tokenBalance } = result;
  const hasBalance = tokenBalance > 0n;
  const hasNeurons = neurons.length > 0;

  return (
    <div className="sns-card">
      <div className="sns-card-header">
        <div className="sns-logo-placeholder">{project.name.charAt(0).toUpperCase()}</div>
        <div className="sns-card-title">
          <h3 className="sns-name">{project.name}</h3>
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
            {neurons.map((n) => {
              // Principals that hold ManagePrincipals (= 2) permission
              const managePrincipals = n.permissions
                .filter((p) => p.permission_type.includes(NeuronPermissionType.ManagePrincipals))
                .map((p) => p.principal)
                .filter((p): p is string => p !== null);

              const isSoleOwner =
                managePrincipals.length === 1 && managePrincipals[0] === scannedPrincipal;
              const hasNoControl = managePrincipals.length === 0;
              const isShared = !isSoleOwner && !hasNoControl;

              const otherPrincipals = managePrincipals.filter((p) => p !== scannedPrincipal);

              return (
                <div key={n.id} className="neuron-row">
                  <div className="neuron-top">
                    <span className="neuron-id" title={n.id}>
                      #{n.id}
                    </span>
                    <div className="neuron-badges">
                      <span className={`neuron-state ${STATE_CLASS[n.state]}`}>
                        {STATE_LABEL[n.state]}
                      </span>
                      {isSoleOwner && (
                        <span className="badge-sole-owner" title="Only principal with ManagePrincipals">
                          sole owner
                        </span>
                      )}
                      {isShared && (
                        <span
                          className="badge-shared"
                          title={`ManagePrincipals also held by: ${otherPrincipals.join(", ")}`}
                        >
                          ⚠ shared
                        </span>
                      )}
                      {hasNoControl && (
                        <span className="badge-no-control" title="No principal holds ManagePrincipals">
                          no control
                        </span>
                      )}
                    </div>
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
                        {formatDays(n.dissolveDelaySeconds)}
                      </span>
                    )}
                    {n.totalMaturityE8s > 0n && (
                      <span className="neuron-detail">
                        <span className="detail-label">Total Maturity</span>
                        {formatTokenAmount(n.totalMaturityE8s, project.tokenDecimals)}{" "}
                        {project.tokenSymbol}
                      </span>
                    )}
                    {n.stakedMaturityE8s > 0n && (
                      <span className="neuron-detail">
                        <span className="detail-label">Staked Maturity</span>
                        {formatTokenAmount(n.stakedMaturityE8s, project.tokenDecimals)}{" "}
                        {project.tokenSymbol}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
