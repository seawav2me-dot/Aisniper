import { WebSocket } from "ws";
import { logger } from "./logger";

const TEMP_TTL_MS = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

interface TempEntry {
  price: number;
  addedAt: number;
  expiresAt: number;
  ws: WebSocket | null;
}

const tempMap = new Map<string, TempEntry>();
let cleanupTimer: NodeJS.Timeout | null = null;

async function fetchSpotPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6_000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { price: string };
    const price = parseFloat(data.price);
    return price > 0 ? price : null;
  } catch {
    return null;
  }
}

function openTempWs(symbol: string): void {
  const key = symbol.toUpperCase();
  const entry = tempMap.get(key);
  if (!entry) return;

  const url = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@miniTicker`;
  const ws = new WebSocket(url);

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as { c: string };
      const price = parseFloat(msg.c);
      if (price > 0) {
        const e = tempMap.get(key);
        if (e) e.price = price;
      }
    } catch {}
  });

  ws.on("error", () => ws.terminate());
  ws.on("close", () => {
    const e = tempMap.get(key);
    if (e) e.ws = null;
  });

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30_000);

  ws.on("close", () => clearInterval(pingTimer));

  entry.ws = ws;
}

export async function ensurePriceTracked(rawSymbol: string): Promise<number | null> {
  const symbol = rawSymbol.toUpperCase().endsWith("USDT")
    ? rawSymbol.toUpperCase()
    : `${rawSymbol.toUpperCase()}USDT`;

  const existing = tempMap.get(symbol);
  if (existing) {
    existing.expiresAt = Date.now() + TEMP_TTL_MS;
    logger.info({ symbol }, "onDemandPriceTracker: TTL extended");
    return existing.price;
  }

  logger.info({ symbol }, "onDemandPriceTracker: new symbol — fetching REST price");
  const price = await fetchSpotPrice(symbol);

  if (!price) {
    logger.warn({ symbol }, "onDemandPriceTracker: symbol not found on Binance");
    return null;
  }

  const entry: TempEntry = {
    price,
    addedAt: Date.now(),
    expiresAt: Date.now() + TEMP_TTL_MS,
    ws: null,
  };
  tempMap.set(symbol, entry);

  openTempWs(symbol);

  logger.info(
    { symbol, price, expiresInMs: TEMP_TTL_MS },
    "onDemandPriceTracker: tracking started — expires in 2h"
  );

  return price;
}

export function getTempPrice(symbol: string): number | null {
  const key = symbol.toUpperCase().endsWith("USDT")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}USDT`;
  return tempMap.get(key)?.price ?? null;
}

export function getTempTrackedSymbols(): string[] {
  return Array.from(tempMap.keys());
}

function cleanup(): void {
  const now = Date.now();
  for (const [symbol, entry] of tempMap.entries()) {
    if (now >= entry.expiresAt) {
      try { entry.ws?.terminate(); } catch {}
      tempMap.delete(symbol);
      logger.info({ symbol }, "onDemandPriceTracker: expired — removed");
    }
  }
}

export function startOnDemandTracker(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  logger.info({ cleanupIntervalMs: CLEANUP_INTERVAL_MS }, "onDemandPriceTracker: started");
}

export function stopOnDemandTracker(): void {
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  for (const entry of tempMap.values()) {
    try { entry.ws?.terminate(); } catch {}
  }
  tempMap.clear();
  logger.info("onDemandPriceTracker: stopped");
}
