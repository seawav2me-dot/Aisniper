import { Router, type IRouter } from "express";
import { getActiveSignals, getMonthlyStats, seedIfEmpty } from "../lib/signalHistoryService";
import { notifyHighConfidenceSignal } from "../lib/alertService";
import { autoRegisterPaperTrade } from "../lib/paperTradingService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/signals", (_req, res) => {
  const signals = getActiveSignals();
  res.json({ ok: true, signals });
});

router.post("/signals/broadcast", async (req, res) => {
  const { signal } = req.body as { signal?: ReturnType<typeof getActiveSignals>[0] };
  if (!signal) {
    res.status(400).json({ ok: false, error: "signal body required" });
    return;
  }

  try {
    if (signal.confidence >= 85) {
      await autoRegisterPaperTrade(signal);
      await notifyHighConfidenceSignal(signal);
      logger.info({ pair: signal.pair, confidence: signal.confidence }, "High-confidence signal broadcast");
    }
    res.json({ ok: true });
  } catch (e) {
    logger.error({ e }, "signals/broadcast error");
    res.status(500).json({ ok: false, error: "broadcast failed" });
  }
});

router.post("/signals/close", async (req, res) => {
  const { signal, event } = req.body as {
    signal?: ReturnType<typeof getActiveSignals>[0];
    event?: "TP1" | "TP2" | "TP3" | "SL";
  };

  if (!signal || !event) {
    res.status(400).json({ ok: false, error: "signal and event required" });
    return;
  }

  try {
    const { closePaperTradeWithOutcome } = await import("../lib/paperTradingService");
    await closePaperTradeWithOutcome(signal, event);
    res.json({ ok: true });
  } catch (e) {
    logger.error({ e }, "signals/close error");
    res.status(500).json({ ok: false, error: "close failed" });
  }
});

router.get("/performance", async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string | undefined) ?? "6", 10), 12);
  await seedIfEmpty();
  const stats = await getMonthlyStats(limit);
  res.json({ ok: true, stats });
});

export default router;
