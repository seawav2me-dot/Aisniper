import { Router, type IRouter } from "express";
import { getActiveSignals, getMonthlyStats, seedIfEmpty } from "../lib/signalHistoryService";

const router: IRouter = Router();

router.get("/signals", (_req, res) => {
  const signals = getActiveSignals();
  res.json({ ok: true, signals });
});

router.get("/performance", async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string | undefined) ?? "6", 10), 12);

  await seedIfEmpty();
  const stats = await getMonthlyStats(limit);

  res.json({ ok: true, stats });
});

export default router;
