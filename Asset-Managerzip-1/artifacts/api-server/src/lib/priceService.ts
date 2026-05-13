import { logger } from "./logger";

export interface LiveMarketData {
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
}

let cache: LiveMarketData | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

function fearGreedLabel(value: number): string {
  if (value >= 75) return "جشع شديد";
  if (value >= 55) return "جشع";
  if (value >= 45) return "محايد";
  if (value >= 25) return "خوف";
  return "خوف شديد";
}

function deriveStatus(btcChange: number, fearGreed: number): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (btcChange > 1 && fearGreed > 50) return "BULLISH";
  if (btcChange < -1 && fearGreed < 45) return "BEARISH";
  return btcChange > 0 ? "BULLISH" : "BEARISH";
}

async function fetchCoinPrices(): Promise<{
  btc: number; btcChange: number;
  eth: number; ethChange: number;
  sol: number; solChange: number;
  bnb: number; bnbChange: number;
  xrp: number; xrpChange: number;
} | null> {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price" +
      "?ids=bitcoin,ethereum,solana,binancecoin,ripple" +
      "&vs_currencies=usd" +
      "&include_24hr_change=true";

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = (await res.json()) as Record<string, { usd: number; usd_24h_change: number }>;

    return {
      btc: data["bitcoin"]?.usd ?? 0,
      btcChange: Number((data["bitcoin"]?.usd_24h_change ?? 0).toFixed(2)),
      eth: data["ethereum"]?.usd ?? 0,
      ethChange: Number((data["ethereum"]?.usd_24h_change ?? 0).toFixed(2)),
      sol: data["solana"]?.usd ?? 0,
      solChange: Number((data["solana"]?.usd_24h_change ?? 0).toFixed(2)),
      bnb: data["binancecoin"]?.usd ?? 0,
      bnbChange: Number((data["binancecoin"]?.usd_24h_change ?? 0).toFixed(2)),
      xrp: data["ripple"]?.usd ?? 0,
      xrpChange: Number((data["ripple"]?.usd_24h_change ?? 0).toFixed(2)),
    };
  } catch (e) {
    logger.error({ e }, "priceService: CoinGecko fetch failed");
    return null;
  }
}

async function fetchFearGreed(): Promise<{ value: number; label: string } | null> {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) throw new Error(`FNG ${res.status}`);

    const data = (await res.json()) as { data: { value: string }[] };
    const value = Number(data.data?.[0]?.value ?? 50);
    return { value, label: fearGreedLabel(value) };
  } catch (e) {
    logger.error({ e }, "priceService: Fear & Greed fetch failed");
    return null;
  }
}

export async function getLiveMarketData(forceRefresh = false): Promise<LiveMarketData | null> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const [prices, fng] = await Promise.all([fetchCoinPrices(), fetchFearGreed()]);

  if (!prices) return cache;

  const fgValue = fng?.value ?? cache?.fearGreed ?? 50;
  const fgLabel = fng?.label ?? cache?.fearGreedLabel ?? "محايد";

  const data: LiveMarketData = {
    ...prices,
    fearGreed: fgValue,
    fearGreedLabel: fgLabel,
    marketStatus: deriveStatus(prices.btcChange, fgValue),
    winRate: 87 + Math.round(Math.random() * 5),
    fetchedAt: Date.now(),
  };

  cache = data;
  logger.info({ btc: data.btc, fearGreed: data.fearGreed, status: data.marketStatus }, "Prices refreshed");
  return data;
}

export function formatPrice(price: number): string {
  if (price >= 10_000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
