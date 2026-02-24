/**
 * ICPSwap price feed integration.
 *
 * Prices are fetched from https://api.icpswap.com/info/token/all.
 * Each entry contains a `tokenLedgerId` (canister ID of the token's ledger)
 * and a `price` field — the USD price of one whole token as a decimal string.
 *
 * The native ICP token is included in the feed under its well-known ledger ID,
 * which lets us derive the ICP/USD rate from the same request.
 */

const ICPSWAP_API_URL = "https://api.icpswap.com/info/token/all";

/** Well-known ledger canister ID of the ICP token on ICPSwap */
export const ICP_LEDGER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";

/** Raw record returned by the ICPSwap /info/token/all endpoint. */
export interface IcpSwapTokenInfo {
  tokenLedgerId: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  /** Current USD price of one whole token, as a decimal string */
  price: string;
  priceChange24H: string;
  tvlUSD: string;
  volumeUSD24H: string;
  volumeUSD7D: string;
}

interface IcpSwapApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * Map from ledger canister ID → raw USD price (float number).
 * Only tokens present in the ICPSwap feed are included.
 */
export type PriceMap = Map<string, number>;

/**
 * Fetches the full ICPSwap token list and returns a {@link PriceMap}.
 *
 * @example
 * ```ts
 * const priceMap = await fetchPriceMap();
 * const icpUsd = priceMap.get(ICP_LEDGER_ID); // e.g. 7.42
 * ```
 */
export async function fetchPriceMap(): Promise<PriceMap> {
    const logMessagePrefix = "fetchPriceMap:";
    console.log(`${logMessagePrefix} Fetching price map from ICPSwap...`);
  const response = await fetch(ICPSWAP_API_URL);
  console.log(`${logMessagePrefix} ICPSwap response: HTTP ${response.status} ${response.statusText}`);
  if (!response.ok) {
    console.error(`${logMessagePrefix} Failed to fetch price map: HTTP ${response.status} ${response.statusText}`);
    throw new Error(
      `ICPSwap price feed returned HTTP ${response.status}: ${response.statusText}`
    );
  }

  const json = (await response.json()) as IcpSwapApiResponse<IcpSwapTokenInfo[]>;
  if (json.code !== 200) {
    throw new Error(`ICPSwap API error [code=${json.code}]: ${json.message}`);
  }

  const data: IcpSwapTokenInfo[] = Array.isArray(json.data) ? json.data : [];
  console.log(`${logMessagePrefix} ICPSwap response parsed: ${data.length} tokens received.`);

  const map: PriceMap = new Map();
  for (const entry of data) {
    const price = parseFloat(entry.price);
    if (isFinite(price) && price > 0) {
      map.set(entry.tokenLedgerId, price);
    }
  }
  console.log(`${logMessagePrefix} Price map constructed with ${map.size} entries.`);
  return map;
}
