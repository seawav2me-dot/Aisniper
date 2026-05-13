import Constants from "expo-constants";

const env = (Constants.expoConfig?.extra as Record<string, string> | undefined) ?? {};

export const API_BASE: string =
  (process.env["EXPO_PUBLIC_API_URL"] as string | undefined) ??
  env["apiUrl"] ??
  "";

export const API_KEY: string =
  (process.env["EXPO_PUBLIC_API_KEY"] as string | undefined) ??
  env["apiKey"] ??
  "";

export const WS_PRICES_URL: string = API_BASE
  ? API_BASE.replace(/^http/, "ws") + "/ws/prices"
  : "";

export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (API_KEY) headers["x-api-key"] = API_KEY;
  return headers;
}

export interface LivePricePayload {
  btc: number;
  btcChange: number;
  eth: number;
  ethChange: number;
  sol: number;
  solChange: number;
  bnb: number;
  bnbChange: number;
  xrp: number;
  xrpChange: number;
  fearGreed: number;
  fearGreedLabel: string;
  marketStatus: "BULLISH" | "BEARISH" | "NEUTRAL";
  winRate: number;
  fetchedAt: number;
  livePrices?: Record<string, number>;
  source?: string;
}

export function getPriceForSymbol(
  payload: LivePricePayload | null,
  symbol: string,
): number | null {
  if (!payload) return null;
  const key = symbol.toUpperCase().endsWith("USDT")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}USDT`;
  if (payload.livePrices && payload.livePrices[key] !== undefined) {
    return payload.livePrices[key]!;
  }
  const map: Record<string, number | undefined> = {
    BTCUSDT: payload.btc,
    ETHUSDT: payload.eth,
    SOLUSDT: payload.sol,
    BNBUSDT: payload.bnb,
    XRPUSDT: payload.xrp,
  };
  return map[key] ?? null;
}

export async function fetchPrices(): Promise<LivePricePayload | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/prices`, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok: boolean; data: LivePricePayload };
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}
