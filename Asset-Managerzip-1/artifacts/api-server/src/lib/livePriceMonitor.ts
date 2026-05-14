import { WebSocket } from "ws";
import { logger } from "./logger";
import { getActiveSymbols, onSymbolsChanged } from "./symbolDiscovery";
import { getTempPrice } from "./onDemandPriceTracker";

export type SymbolPriceMap = Map<string, number>;

const priceMap: SymbolPriceMap = new Map();
const wsConnections: WebSocket[] = [];
let reconnectTimers: NodeJS.Timeout[] = [];
let isRunning = false;

const BATCH_SIZE = 300;

interface MiniTicker {
  e: "24hrMiniTicker";
  s: string;
  c: string;
}

interface StreamMessage {
  stream: string;
  data: MiniTicker;
}

function buildUrl(symbols: string[]): string {
  return (
    "wss://stream.binance.com:9443/stream?streams=" +
    symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join("/")
  );
}

function connectBatch(symbols: string[], batchIndex: number): WebSocket {
  const url = buildUrl(symbols);
  logger.info(
    { batch: batchIndex, symbols: symbols.length },
    "livePriceMonitor: connecting batch"
  );

  const ws = new WebSocket(url);

  ws.on("open", () => {
    logger.info(
      { batch: batchIndex, symbols: symbols.length },
      "livePriceMonitor: batch connected"
    );
  });

  ws.on("message", (raw: Buffer) => {
    try {
      const msg = JSON.parse(raw.toString()) as StreamMessage;
      if (msg.data?.s && msg.data?.c) {
        const price = parseFloat(msg.data.c);
        if (price > 0) {
          priceMap.set(msg.data.s.toUpperCase(), price);
        }
      }
    } catch {}
  });

  ws.on("close", (code, reason) => {
    logger.warn(
      { batch: batchIndex, code, reason: reason.toString() },
      "livePriceMonitor: WS closed — reconnecting in 5s"
    );
    if (isRunning) {
      const t = setTimeout(() => {
        if (isRunning) {
          const idx = wsConnections.indexOf(ws);
          if (idx !== -1) {
            wsConnections[idx] = connectBatch(symbols, batchIndex);
          }
        }
      }, 5_000);
      reconnectTimers.push(t);
    }
  });

  ws.on("error", (err) => {
    logger.error({ batch: batchIndex, err }, "livePriceMonitor: WS error");
    ws.terminate();
  });

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30_000);

  ws.on("close", () => clearInterval(pingTimer));

  return ws;
}

function disconnectAll() {
  for (const t of reconnectTimers) clearTimeout(t);
  reconnectTimers = [];
  for (const ws of wsConnections) {
    try { ws.terminate(); } catch {}
  }
  wsConnections.length = 0;
}

function connectAll(symbols: string[]) {
  disconnectAll();

  if (symbols.length === 0) {
    logger.warn("livePriceMonitor: no symbols to track");
    return;
  }

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    wsConnections.push(connectBatch(batch, Math.floor(i / BATCH_SIZE)));
  }

  logger.info(
    { total: symbols.length, batches: wsConnections.length },
    "livePriceMonitor: all batches connected"
  );
}

export function startLivePriceMonitor() {
  isRunning = true;

  const symbols = getActiveSymbols();
  connectAll(symbols);

  onSymbolsChanged((newSymbols) => {
    if (!isRunning) return;
    logger.info(
      { prev: symbols.length, next: newSymbols.length },
      "livePriceMonitor: symbol list updated — reconnecting"
    );
    connectAll(newSymbols);
  });

  logger.info(
    { symbols: symbols.length, batches: Math.ceil(symbols.length / BATCH_SIZE) },
    "livePriceMonitor: started"
  );
}

export function stopLivePriceMonitor() {
  isRunning = false;
  disconnectAll();
  logger.info("livePriceMonitor: stopped");
}

export function getLivePrice(symbol: string): number | null {
  const key = symbol.toUpperCase().endsWith("USDT")
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}USDT`;
  return priceMap.get(key) ?? getTempPrice(key) ?? null;
}

export function getAllLivePrices(): Record<string, number> {
  return Object.fromEntries(priceMap.entries());
}

export function isMonitorReady(): boolean {
  return priceMap.size > 0;
}
