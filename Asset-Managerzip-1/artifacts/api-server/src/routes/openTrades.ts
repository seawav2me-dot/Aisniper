import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { signalHistoryTable } from "@workspace/db/schema";
import { isNull } from "drizzle-orm";
import { getLivePrice, isMonitorReady } from "../lib/livePriceMonitor";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/open-trades", async (req, res) => {
  try {
    const FREE_PAPER_LIMIT = 2;
    const FREE_PAPER_DELAY_MS = 30 * 60 * 1000;
    const tier = (req.query["tier"] as string | undefined) ?? "free";
    const isFree = tier === "free";

    const rows = await db
      .select()
      .from(signalHistoryTable)
      .where(isNull(signalHistoryTable.closedAt));

    const trades = rows.map((t) => {
      const entry = parseFloat(t.entryPrice);
      const sl = parseFloat(t.sl);
      const tp1 = parseFloat(t.tp1);
      const tp2 = parseFloat(t.tp2);
      const tp3 = t.tp3 ? parseFloat(t.tp3) : null;
      const currentPrice = isMonitorReady() ? getLivePrice(t.symbol) : null;

      let unrealizedPct: number | null = null;
      let unrealizedUsd: number | null = null;
      let distToTp1Pct: number | null = null;
      let distToSlPct: number | null = null;

      if (currentPrice !== null) {
        const mult = t.direction === "LONG" ? 1 : -1;
        unrealizedPct = mult * ((currentPrice - entry) / entry) * 100;
        unrealizedUsd = unrealizedPct;
        distToTp1Pct = t.direction === "LONG"
          ? ((tp1 - currentPrice) / currentPrice) * 100
          : ((currentPrice - tp1) / currentPrice) * 100;
        distToSlPct = t.direction === "LONG"
          ? ((currentPrice - sl) / currentPrice) * 100
          : ((sl - currentPrice) / currentPrice) * 100;
      }

      return {
        id: t.id,
        symbol: t.symbol,
        direction: t.direction,
        tier: t.tier,
        aiScore: t.aiScore,
        entryPrice: entry,
        tp1,
        tp2,
        tp3,
        sl,
        rrRatio: parseFloat(t.rrRatio),
        openedAt: t.openedAt,
        currentPrice,
        unrealizedPct: unrealizedPct !== null ? parseFloat(unrealizedPct.toFixed(2)) : null,
        unrealizedUsd: unrealizedUsd !== null ? parseFloat(unrealizedUsd.toFixed(2)) : null,
        distToTp1Pct: distToTp1Pct !== null ? parseFloat(distToTp1Pct.toFixed(2)) : null,
        distToSlPct: distToSlPct !== null ? parseFloat(distToSlPct.toFixed(2)) : null,
        liveDataAvailable: currentPrice !== null,
      };
    });

    const visibleTrades = isFree
      ? trades
          .filter((t) => {
            const openedMs = t.openedAt ? new Date(t.openedAt).getTime() : 0;
            return Date.now() - openedMs >= FREE_PAPER_DELAY_MS;
          })
          .slice(0, FREE_PAPER_LIMIT)
      : trades;

    res.json({
      ok: true,
      trades: visibleTrades,
      count: visibleTrades.length,
      freeUser: isFree,
      paperTradeLimit: isFree ? FREE_PAPER_LIMIT : null,
      delayMinutes: isFree ? 30 : 0,
    });
  } catch (e) {
    logger.error({ e }, "GET /open-trades error");
    res.status(500).json({ ok: false, error: "Failed to fetch open trades" });
  }
});

router.get("/trade-stats", async (_req, res) => {
  try {
    const allRows = await db.select().from(signalHistoryTable);

    const closed = allRows.filter((r) => r.closedAt !== null && r.outcome !== null);
    const open = allRows.filter((r) => r.closedAt === null);

    const wins = closed.filter((r) =>
      r.outcome === "WIN_TP1" || r.outcome === "WIN_TP2" || r.outcome === "WIN_TP3"
    );
    const losses = closed.filter((r) => r.outcome === "LOSS");

    const totalProfit = wins.reduce((acc, r) => acc + (r.profitPct ? parseFloat(r.profitPct) : 0), 0);
    const totalLoss = losses.reduce((acc, r) => acc + (r.profitPct ? parseFloat(r.profitPct) : 0), 0);

    res.json({
      ok: true,
      stats: {
        openTrades: open.length,
        closedTrades: closed.length,
        wins: wins.length,
        losses: losses.length,
        winRate: closed.length > 0 ? parseFloat(((wins.length / closed.length) * 100).toFixed(1)) : 0,
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        totalLoss: parseFloat(totalLoss.toFixed(2)),
        netPnl: parseFloat((totalProfit + totalLoss).toFixed(2)),
      },
    });
  } catch (e) {
    logger.error({ e }, "GET /trade-stats error");
    res.status(500).json({ ok: false, error: "Failed to fetch trade stats" });
  }
});

export default router;
