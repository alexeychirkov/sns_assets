import { useEffect, useRef } from "react";
import type { NervousSystemParamsInfo, SnsNeuronInfo } from "sns-assets";
import { getNeuronPermissionName } from "sns-assets";
import {
  formatDuration,
  formatTokenAmount,
  formatUsdE6s,
  formatIcpE8s,
} from "../lib/format";

interface Props {
  neuron: SnsNeuronInfo;
  symbol: string;
  decimals: number;
  nervousSystemParams?: NervousSystemParamsInfo;
  onClose: () => void;
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

function formatTimestamp(seconds: bigint): string {
  const ms = Number(seconds) * 1000;
  return new Date(ms).toLocaleString();
}

export function NeuronModal({ neuron, symbol, decimals, nervousSystemParams, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();

    function onCancel(e: Event) {
      e.preventDefault();
      onClose();
    }
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      onClose();
    }
  }

  const { balance: b, valuation: v } = neuron;

  return (
    <dialog
      ref={dialogRef}
      className="neuron-modal"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="neuron-modal-header">
        <span className="neuron-modal-title">Neuron details</span>
        <button className="neuron-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="neuron-modal-body">
        {/* Identity */}
        <section className="neuron-modal-section">
          <div className="neuron-modal-section-title">Identity</div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">ID</span>
            <span className="neuron-modal-value neuron-modal-id">{neuron.id}</span>
          </div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">State</span>
            <span className={`neuron-modal-value badge ${STATE_CLASS[neuron.state]}`}>
              {STATE_LABEL[neuron.state] ?? neuron.state}
            </span>
          </div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">Sole owner</span>
            <span className="neuron-modal-value">{neuron.isSoleOwner ? "Yes" : "No"}</span>
          </div>
        </section>

        {/* Timing */}
        <section className="neuron-modal-section">
          <div className="neuron-modal-section-title">Timing</div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">
              {neuron.state === "dissolving" ? "Remaining" : "Delay"}
            </span>
            <span className="neuron-modal-value">
              {formatDuration(neuron.dissolveDelaySeconds)}
            </span>
          </div>
          {neuron.dissolveAt !== undefined && (
            <div className="neuron-modal-row">
              <span className="neuron-modal-label">Dissolves at</span>
              <span className="neuron-modal-value">
                {formatTimestamp(neuron.dissolveAt)}
              </span>
            </div>
          )}
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">VP multiplier</span>
            <span className="neuron-modal-value">
              {(Number(neuron.votingPowerPercentageMultiplier) / 100).toFixed(2)}%
            </span>
          </div>
        </section>

        {/* Balance */}
        <section className="neuron-modal-section">
          <div className="neuron-modal-section-title">Balance ({symbol})</div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">Stake</span>
            <span className="neuron-modal-value">
              {formatTokenAmount(b.stakeE8s, decimals)} {symbol}
            </span>
          </div>
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">Maturity</span>
            <span className="neuron-modal-value">
              {formatTokenAmount(b.maturityE8s, decimals)} {symbol}
            </span>
          </div>
          {b.stakedMaturityE8s > 0n && (
            <div className="neuron-modal-row">
              <span className="neuron-modal-label">Staked maturity</span>
              <span className="neuron-modal-value">
                {formatTokenAmount(b.stakedMaturityE8s, decimals)} {symbol}
              </span>
            </div>
          )}
          <div className="neuron-modal-row">
            <span className="neuron-modal-label">Total maturity</span>
            <span className="neuron-modal-value">
              {formatTokenAmount(b.totalMaturityE8s, decimals)} {symbol}
            </span>
          </div>
          <div className="neuron-modal-row neuron-modal-row--total">
            <span className="neuron-modal-label">Total value</span>
            <span className="neuron-modal-value">
              {formatTokenAmount(b.totalValue, decimals)} {symbol}
            </span>
          </div>
        </section>

        {/* Valuation */}
        {v && (
          <section className="neuron-modal-section">
            <div className="neuron-modal-section-title">Valuation</div>
            <div className="neuron-modal-row">
              <span className="neuron-modal-label">USD</span>
              <span className="neuron-modal-value">{formatUsdE6s(v.valueUsd)}</span>
            </div>
            <div className="neuron-modal-row">
              <span className="neuron-modal-label">ICP</span>
              <span className="neuron-modal-value">{formatIcpE8s(v.valueIcp)}</span>
            </div>
          </section>
        )}

        {/* Permissions — one block per principal, all governance perms shown,
            missing ones struck through. Falls back to neuron-only list if
            nervousSystemParams is unavailable. */}
        {neuron.permissions.length > 0 && (
          <section className="neuron-modal-section">
            <div className="neuron-modal-section-title">Permissions</div>
            {neuron.permissions.map((p, i) => {
              const allPerms = nervousSystemParams?.grantablePermissions ?? p.permission_type;
              return (
                <div key={i} className="neuron-modal-permission">
                  <div className="neuron-modal-permission-principal">
                    {p.principal ?? "—"}
                  </div>
                  <div className="neuron-modal-permission-types">
                    {allPerms.map((pt) => {
                      const has = p.permission_type.includes(pt);
                      return (
                        <span
                          key={pt}
                          className={`neuron-modal-permission-tag${has ? "" : " perm-tag--missing"}`}
                        >
                          {getNeuronPermissionName(pt)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Coverage — all grantable perms across all principals, missing = strikethrough */}
        {nervousSystemParams && nervousSystemParams.grantablePermissions.length > 0 && (
          <section className="neuron-modal-section">
            <div className="neuron-modal-section-title">Coverage (all principals)</div>
            <div className="neuron-modal-permission-types">
              {nervousSystemParams.grantablePermissions.map((pt) => {
                const hasIt = neuron.permissions.some((p) => p.permission_type.includes(pt));
                const autoClaimed = nervousSystemParams.claimerPermissions.includes(pt);
                return (
                  <span
                    key={pt}
                    className={`neuron-modal-permission-tag${hasIt ? "" : " perm-tag--missing"}`}
                    title={autoClaimed ? "auto-granted at creation" : undefined}
                  >
                    {getNeuronPermissionName(pt)}
                    {autoClaimed && <span className="perm-coverage-auto">↓</span>}
                  </span>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </dialog>
  );
}
