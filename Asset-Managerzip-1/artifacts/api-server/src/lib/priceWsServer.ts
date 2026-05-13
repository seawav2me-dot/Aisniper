import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { getLiveMarketData } from "./priceService";
import { getAllLivePrices, getLivePrice } from "./livePriceMonitor";
import { logger } from "./logger";

const BROADCAST_INTERVAL_MS = 2_000;

let wss: WebSocketServer | null = null;
let broadcastTimer: NodeJS.Timeout | null = null;

function broadcast(data: object) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

async function broadcastPrices() {
  const livePrices = getAllLivePrices();

  if (Object.keys(livePrices).length > 0) {
    const btc = livePrices["BTCUSDT"] ?? 0;
    const eth = livePrices["ETHUSDT"] ?? 0;
    const sol = livePrices["SOLUSDT"] ?? 0;
    const bnb = livePrices["BNBUSDT"] ?? 0;
    const xrp = livePrices["XRPUSDT"] ?? 0;

    const cached = await getLiveMarketData();

    broadcast({
      type: "prices",
      data: {
        btc,
        btcChange: cached?.btcChange ?? 0,
        eth,
        ethChange: cached?.ethChange ?? 0,
        sol,
        solChange: cached?.solChange ?? 0,
        bnb,
        bnbChange: cached?.bnbChange ?? 0,
        xrp,
        xrpChange: cached?.xrpChange ?? 0,
        fearGreed: cached?.fearGreed ?? 50,
        fearGreedLabel: cached?.fearGreedLabel ?? "محايد",
        marketStatus: cached?.marketStatus ?? "NEUTRAL",
        winRate: cached?.winRate ?? 87,
        fetchedAt: Date.now(),
        livePrices,
      },
    });
  } else {
    const live = await getLiveMarketData();
    if (!live) return;
    broadcast({ type: "prices", data: { ...live, livePrices: {} } });
  }
}

export function attachPriceWsServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/prices" });

  wss.on("connection", async (ws, req) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    logger.info({ ip }, "WS: client connected");

    const livePrices = getAllLivePrices();
    const cached = await getLiveMarketData();

    const payload = Object.keys(livePrices).length > 0
      ? {
          type: "prices",
          data: {
            btc: livePrices["BTCUSDT"] ?? cached?.btc ?? 0,
            eth: livePrices["ETHUSDT"] ?? cached?.eth ?? 0,
            sol: livePrices["SOLUSDT"] ?? cached?.sol ?? 0,
            bnb: livePrices["BNBUSDT"] ?? cached?.bnb ?? 0,
            xrp: livePrices["XRPUSDT"] ?? cached?.xrp ?? 0,
            btcChange: cached?.btcChange ?? 0,
            ethChange: cached?.ethChange ?? 0,
            solChange: cached?.solChange ?? 0,
            bnbChange: cached?.bnbChange ?? 0,
            xrpChange: cached?.xrpChange ?? 0,
            fearGreed: cached?.fearGreed ?? 50,
            fearGreedLabel: cached?.fearGreedLabel ?? "محايد",
            marketStatus: cached?.marketStatus ?? "NEUTRAL",
            winRate: cached?.winRate ?? 87,
            fetchedAt: Date.now(),
            livePrices,
          },
        }
      : cached
        ? { type: "prices", data: { ...cached, livePrices: {} } }
        : null;

    if (payload && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }

    ws.on("close", () => logger.info({ ip }, "WS: client disconnected"));
    ws.on("error", (err) => logger.error({ err, ip }, "WS: client error"));
  });

  broadcastTimer = setInterval(broadcastPrices, BROADCAST_INTERVAL_MS);

  logger.info(
    { path: "/ws/prices", intervalMs: BROADCAST_INTERVAL_MS },
    "WS price server attached — broadcasting live Binance prices every 2s"
  );
}

export function closePriceWsServer() {
  if (broadcastTimer) { clearInterval(broadcastTimer); broadcastTimer = null; }
  if (wss) { wss.close(); wss = null; }
}
