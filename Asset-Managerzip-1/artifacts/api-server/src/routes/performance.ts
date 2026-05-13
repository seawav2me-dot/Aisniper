import { Router, type IRouter } from "express";
import {
  getWeeklyStats,
  getPerformanceSummary,
  getSignalHistory,
} from "../lib/paperTradingService";
import { getMonthlyStats, seedIfEmpty } from "../lib/signalHistoryService";

const router: IRouter = Router();

router.get("/performance", async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string | undefined) ?? "6", 10), 12);
  await seedIfEmpty();
  const stats = await getMonthlyStats(limit);
  res.json({ ok: true, stats });
});

router.get("/performance/weekly", async (_req, res) => {
  await seedIfEmpty();
  const weekly = await getWeeklyStats(8);
  res.json({ ok: true, weekly });
});

router.get("/performance/summary", async (_req, res) => {
  await seedIfEmpty();
  const summary = await getPerformanceSummary();
  res.json({ ok: true, summary });
});

router.get("/performance/history", async (req, res) => {
  const limit = Math.min(parseInt((req.query["limit"] as string | undefined) ?? "50", 10), 200);
  await seedIfEmpty();
  const history = await getSignalHistory(limit);
  res.json({ ok: true, history });
});

export default router;
