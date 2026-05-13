import { WebSocket } from "ws";
import { logger } from "./logger";

export type SymbolPriceMap = Map<string, number>;

const priceMap: SymbolPriceMap = new Map();
let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let isRunning = false;

const TRACKED_SYMBOLS = [
  "btcusdt", "ethusdt", "solusdt", "xrpusdt", "bnbusdt",
  "linkusdt", "avaxusdt", "arbusdt", "adausdt", "dotusdt",
  "maticusdt", "uniusdt", "aaveusdt", "atomusdt", "nearusdt",
];

const BINANCE_WS_URL =
  "wss://stream.binance.com:9443/stream?streams=" +
  TRACKED_SYMBOLS.map((s) => `${s}@miniTicker`).join("/");

interface MiniTicker {
  e: "24hrMiniTicker";
  s: string;
  c: string;
}

interface StreamMessage {
  stream: string;
  data: MiniTicker;
}

function connect() {
  if (!isRunning) return;

  logger.info({ url: BINANCE_WS_URL }, "livePriceMonitor: connecting to Binance WS");

  ws = new WebSocket(BINANCE_WS_URL);

  ws.on("open", () => {
    logger.info({ symbols: TRACKED_SYMBOLS.length }, "livePriceMonitor: connected — streaming live prices");
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
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
      { code, reason: reason.toString() },
      "livePriceMonitor: WS closed — reconnecting in 5s"
    );
    scheduleReconnect(5_000);
  });

  ws.on("error", (err) => {
    logger.error({ err }, "livePriceMonitor: WS error");
    ws?.terminate();
  });

  const pingTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30_000);

  ws.on("close", () => clearInterval(pingTimer));
}

function scheduleReconnect(delay: number) {
  if (!isRunning) return;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    if (isRunning) connect();
  }, delay);
}

export function startLivePriceMonitor() {
  isRunning = true;
  connect();
  logger.info("livePriceMonitor: started");
}

export function stopLivePriceMonitor() {
  isRunning = false;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (ws) { ws.terminate(); ws = null; }
  logger.info("livePriceMonitor: stopped");
}

export function getLivePrice(symbol: string): number | null {
  return priceMap.get(symbol.toUpperCase()) ?? null;
}

export function getAllLivePrices(): Record<string, number> {
  return Object.fromEntries(priceMap.entries());
}

export function isMonitorReady(): boolean {
  return priceMap.size > 0;
}
