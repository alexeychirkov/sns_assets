/**
 * Pure valuation helpers — no network calls.
 *
 * Price fields (tokenPriceUsd, tokenPriceIcp, icpPriceUsd) are plain number
 * floats, matching the ICPSwap price feed.
 *
 * Value amounts use fixed-point bigint:
 *   USD → e2s (cents):  1 USD = 100n
 *   ICP → e8s:          1 ICP = 100_000_000n
 */

import type { PriceMap } from "./prices";
import { ICP_LEDGER_ID } from "./prices";
import type {
  NeuronValuation,
  ProjectValuation,
  SnsNeuronInfo,
  SnsProjectAssets,
  TokenPrices,
} from "./types";

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Compute the USD e6s value of an amount in a token's smallest units.
 * 1 USD = 1_000_000n (same precision as USDC).
 *
 * @param amountSmallest  Amount in smallest token units (bigint)
 * @param tokenPriceUsd   Price of one whole token in USD (float)
 * @param decimals        Token decimal places (e.g. 8)
 */
function toUsd(amountSmallest: bigint, tokenPriceUsd: number, decimals: number): bigint {
  const priceE6 = BigInt(Math.round(tokenPriceUsd * 1_000_000));
  return (amountSmallest * priceE6) / 10n ** BigInt(decimals);
}

/**
 * Compute the ICP-e8s value of an amount in a token's smallest units.
 *
 * @param amountSmallest  Amount in smallest token units (bigint)
 * @param tokenPriceIcp   Price of one whole token in ICP (float)
 * @param decimals        Token decimal places
 */
function toIcp(amountSmallest: bigint, tokenPriceIcp: number, decimals: number): bigint {
  const priceE8s = BigInt(Math.round(tokenPriceIcp * 1e8));
  return (amountSmallest * priceE8s) / 10n ** BigInt(decimals);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Annotates each neuron and the project itself with ICP / USD valuations.
 *
 * The function is **pure** — it returns a new {@link SnsProjectAssets} object
 * (and new neuron objects); the original is never mutated.
 *
 * If the token's ledger ID is not present in `priceMap` *or* the ICP price is
 * absent, valuations are not attached (the optional `valuation` fields remain
 * `undefined`).
 *
 * @param assets    Result from `scanPrincipal` for a single SNS project
 * @param priceMap  Price lookup built by {@link fetchPriceMap}
 * @returns         A new `SnsProjectAssets` with `valuation` fields populated
 *
 * @example
 * ```ts
 * const [result, priceMap] = await Promise.all([
 *   scanPrincipal(principal, projects),
 *   fetchPriceMap(),
 * ]);
 * const enriched = result.assets.map(a => applyValuation(a, priceMap));
 * ```
 */
export function applyValuation(assets: SnsProjectAssets, priceMap: PriceMap): SnsProjectAssets {
  const icpPriceUsdFloat = priceMap.get(ICP_LEDGER_ID);
  const tokenPriceUsdFloat = priceMap.get(assets.project.ledgerCanisterId);

  // If either price is unavailable, return the original object unchanged.
  if (icpPriceUsdFloat === undefined || tokenPriceUsdFloat === undefined || icpPriceUsdFloat <= 0) {
    return assets;
  }

  const decimals = assets.project.tokenDecimals ?? 8;

  // ── Prices ───────────────────────────────────────────────────────────────────
  const prices: TokenPrices = {
    icpPriceUsd: icpPriceUsdFloat,
    tokenPriceUsd: tokenPriceUsdFloat,
    tokenPriceIcp: tokenPriceUsdFloat / icpPriceUsdFloat,
  };
  const { tokenPriceUsd, tokenPriceIcp } = prices;

  // ── Per-neuron valuations ────────────────────────────────────────────────
  const valuatedNeurons: SnsNeuronInfo[] = assets.neurons.map((neuron) => {
    const amount = neuron.balance.stakeE8s + neuron.balance.totalMaturityE8s;
    const neuronValuation: NeuronValuation = {
      valueUsd: toUsd(amount, tokenPriceUsd, decimals),
      valueIcp: toIcp(amount, tokenPriceIcp, decimals),
    };
    return { ...neuron, valuation: neuronValuation };
  });

  // ── Token balance valuation ──────────────────────────────────────────────
  const tokenBalanceUsd = toUsd(assets.balance.tokenBalance, tokenPriceUsd, decimals);
  const tokenBalanceIcp = toIcp(assets.balance.tokenBalance, tokenPriceIcp, decimals);

  // ── Neurons aggregate ────────────────────────────────────────────────────
  let neuronsValueUsd = 0n;
  let neuronsValueIcp = 0n;
  let ownerNeuronsValueUsd = 0n;
  let ownerNeuronsValueIcp = 0n;

  for (const neuron of valuatedNeurons) {
    const v = neuron.valuation!;
    neuronsValueUsd += v.valueUsd;
    neuronsValueIcp += v.valueIcp;
    if (neuron.isSoleOwner) {
      ownerNeuronsValueUsd += v.valueUsd;
      ownerNeuronsValueIcp += v.valueIcp;
    }
  }

  // ── Project valuation ────────────────────────────────────────────────────
  const projectValuation: ProjectValuation = {
    prices,
    tokenBalanceUsd,
    tokenBalanceIcp,
    neuronsValueUsd,
    neuronsValueIcp,
    ownerNeuronsValueUsd,
    ownerNeuronsValueIcp,
    totalValueUsd: tokenBalanceUsd + neuronsValueUsd,
    totalValueIcp: tokenBalanceIcp + neuronsValueIcp,
    ownerValueUsd: tokenBalanceUsd + ownerNeuronsValueUsd,
    ownerValueIcp: tokenBalanceIcp + ownerNeuronsValueIcp,
  };

  return {
    ...assets,
    neurons: valuatedNeurons,
    valuation: projectValuation,
  };
}
