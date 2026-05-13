import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { getLiveMarketData } from "./priceService";
import { logger } from "./logger";

const BROADCAST_INTERVAL_MS = 15_000;

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
  const live = await getLiveMarketData();
  if (!live) return;
  broadcast({ type: "prices", data: live });
}

export function attachPriceWsServer(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/prices" });

  wss.on("connection", async (ws, req) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    logger.info({ ip }, "WS: client connected");

    const live = await getLiveMarketData();
    if (live && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "prices", data: live }));
    }

    ws.on("close", () => {
      logger.info({ ip }, "WS: client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, ip }, "WS: client error");
    });
  });

  broadcastTimer = setInterval(broadcastPrices, BROADCAST_INTERVAL_MS);

  logger.info({ path: "/ws/prices", intervalMs: BROADCAST_INTERVAL_MS }, "WS price server attached");
}

export function closePriceWsServer() {
  if (broadcastTimer) {
    clearInterval(broadcastTimer);
    broadcastTimer = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
}
