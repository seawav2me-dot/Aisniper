import { Router, type IRouter } from "express";
import { getLiveMarketData } from "../lib/priceService";
import { getAllLivePrices, getLivePrice, isMonitorReady } from "../lib/livePriceMonitor";

const router: IRouter = Router();

router.get("/prices", async (_req, res) => {
  const livePrices = getAllLivePrices();
  const cached = await getLiveMarketData();

  if (!cached && !isMonitorReady()) {
    res.status(503).json({ error: "Price data unavailable — upstream API unreachable" });
    return;
  }

  const data = isMonitorReady()
    ? {
        btc: livePrices["BTCUSDT"] ?? cached?.btc ?? 0,
        btcChange: cached?.btcChange ?? 0,
        eth: livePrices["ETHUSDT"] ?? cached?.eth ?? 0,
        ethChange: cached?.ethChange ?? 0,
        sol: livePrices["SOLUSDT"] ?? cached?.sol ?? 0,
        solChange: cached?.solChange ?? 0,
        bnb: livePrices["BNBUSDT"] ?? cached?.bnb ?? 0,
        bnbChange: cached?.bnbChange ?? 0,
        xrp: livePrices["XRPUSDT"] ?? cached?.xrp ?? 0,
        xrpChange: cached?.xrpChange ?? 0,
        fearGreed: cached?.fearGreed ?? 50,
        fearGreedLabel: cached?.fearGreedLabel ?? "محايد",
        marketStatus: cached?.marketStatus ?? "NEUTRAL",
        winRate: cached?.winRate ?? 87,
        fetchedAt: Date.now(),
        source: "binance-live",
      }
    : { ...cached, source: "coingecko-cached" };

  res.json({ ok: true, data });
});

router.get("/prices/live", (_req, res) => {
  if (!isMonitorReady()) {
    res.status(503).json({ error: "Live price stream not ready yet — starting up" });
    return;
  }
  res.json({ ok: true, data: getAllLivePrices(), fetchedAt: Date.now() });
});

router.get("/prices/live/:symbol", (req, res) => {
  const symbol = req.params.symbol?.toUpperCase();
  if (!symbol) {
    res.status(400).json({ error: "Symbol required" });
    return;
  }

  const normalized = symbol.endsWith("USDT") ? symbol : `${symbol}USDT`;
  const price = getLivePrice(normalized);

  if (price === null) {
    res.status(404).json({ error: `No live price for ${normalized}` });
    return;
  }

  res.json({ ok: true, symbol: normalized, price, fetchedAt: Date.now() });
});

router.post("/prices/refresh", async (_req, res) => {
  const data = await getLiveMarketData(true);
  if (!data) {
    res.status(503).json({ error: "Price refresh failed" });
    return;
  }
  res.json({ ok: true, data });
});

export default router;
