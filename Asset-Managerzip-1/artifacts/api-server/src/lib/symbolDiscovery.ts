import { logger } from "./logger";

export interface DiscoveredSymbol {
  symbol: string;
  priceChangePercent: number;
  quoteVolume: number;
  count: number;
}

const STABLECOIN_BLACKLIST = new Set([
  "USDCUSDT", "BUSDUSDT", "TUSDUSDT", "USDTUSDT", "DAIUSDT", "USDPUSDT",
  "FRAXUSDT", "GUSDUSDT", "USTUSDT", "SUSDUSDT", "EURUSDT", "GBPUSDT",
  "USDTBIDR", "AEURUSDT", "FDUSDUSDT", "PYUSDUSDT", "LISUSDUSDT",
]);

const FILTER_VOLUME_USD   = 5_000_000;
const FILTER_CHANGE_PCT   = 5;
const FILTER_TRADE_COUNT  = 1_000;
const MAX_SYMBOLS         = 250;
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

let activeSymbols: string[] = [];
let lastFetchedAt = 0;
let refreshTimer: NodeJS.Timeout | null = null;
let onSymbolsChangedCallback: ((symbols: string[]) => void) | null = null;

interface BinanceTicker {
  symbol: string;
  priceChangePercent: string;
  quoteVolume: string;
  count: number;
}

async function fetchBinanceTickers(): Promise<BinanceTicker[]> {
  const res = await fetch(
    "https://api.binance.com/api/v3/ticker/24hr",
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!res.ok) throw new Error(`Binance ticker API: ${res.status}`);
  return res.json() as Promise<BinanceTicker[]>;
}

function passesFilter(t: BinanceTicker): boolean {
  if (!t.symbol.endsWith("USDT")) return false;
  if (STABLECOIN_BLACKLIST.has(t.symbol)) return false;

  const volume = parseFloat(t.quoteVolume);
  const changePct = Math.abs(parseFloat(t.priceChangePercent));
  const tradeCount = t.count;

  return volume >= FILTER_VOLUME_USD
    || changePct >= FILTER_CHANGE_PCT
    || tradeCount >= FILTER_TRADE_COUNT;
}

async function discover(): Promise<void> {
  try {
    logger.info("symbolDiscovery: fetching all Binance USDT tickers...");
    const tickers = await fetchBinanceTickers();

    const filtered: DiscoveredSymbol[] = tickers
      .filter(passesFilter)
      .map((t) => ({
        symbol: t.symbol,
        priceChangePercent: parseFloat(t.priceChangePercent),
        quoteVolume: parseFloat(t.quoteVolume),
        count: t.count,
      }))
      .sort((a, b) => b.quoteVolume - a.quoteVolume)
      .slice(0, MAX_SYMBOLS);

    const newSymbols = filtered.map((f) => f.symbol.toLowerCase());

    const changed =
      newSymbols.length !== activeSymbols.length ||
      newSymbols.some((s, i) => s !== activeSymbols[i]);

    activeSymbols = newSymbols;
    lastFetchedAt = Date.now();

    logger.info(
      {
        total: tickers.length,
        afterFilter: filtered.length,
        capped: filtered.length === MAX_SYMBOLS,
      },
      "symbolDiscovery: symbols updated"
    );

    if (changed && onSymbolsChangedCallback) {
      onSymbolsChangedCallback(activeSymbols);
    }
  } catch (err) {
    logger.error({ err }, "symbolDiscovery: failed to fetch tickers — keeping previous list");
  }
}

export function getActiveSymbols(): string[] {
  return activeSymbols;
}

export function getDiscoveryStats() {
  return {
    count: activeSymbols.length,
    lastFetchedAt,
    filters: {
      volumeUsd: FILTER_VOLUME_USD,
      changePct: FILTER_CHANGE_PCT,
      tradeCount: FILTER_TRADE_COUNT,
      maxSymbols: MAX_SYMBOLS,
    },
  };
}

export function onSymbolsChanged(cb: (symbols: string[]) => void): void {
  onSymbolsChangedCallback = cb;
}

export async function startSymbolDiscovery(): Promise<void> {
  await discover();

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    discover().catch((e) =>
      logger.error({ e }, "symbolDiscovery: refresh failed")
    );
  }, REFRESH_INTERVAL_MS);

  logger.info(
    { refreshIntervalMs: REFRESH_INTERVAL_MS, symbols: activeSymbols.length },
    "symbolDiscovery: started — refreshes every hour"
  );
}

export function stopSymbolDiscovery(): void {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  logger.info("symbolDiscovery: stopped");
}
