import { db } from "@workspace/db";
import { signalHistoryTable } from "@workspace/db/schema";
import { isNull, eq } from "drizzle-orm";
import { getLivePrice, isMonitorReady } from "./livePriceMonitor";
import { notifyTpSlHit } from "./alertService";
import { logger } from "./logger";

const CHECK_INTERVAL_MS = 3_000;
let monitorTimer: NodeJS.Timeout | null = null;
const closingInProgress = new Set<number>();

interface OpenTrade {
  id: number;
  symbol: string;
  direction: string;
  entryPrice: string;
  tp1: string;
  tp2: string;
  tp3: string;
  sl: string;
  aiScore: number;
  tier: string;
  rrRatio: string;
  openedAt: Date;
}

async function fetchOpenTrades(): Promise<OpenTrade[]> {
  try {
    const rows = await db
      .select({
        id: signalHistoryTable.id,
        symbol: signalHistoryTable.symbol,
        direction: signalHistoryTable.direction,
        entryPrice: signalHistoryTable.entryPrice,
        tp1: signalHistoryTable.tp1,
        tp2: signalHistoryTable.tp2,
        tp3: signalHistoryTable.tp3,
        sl: signalHistoryTable.sl,
        aiScore: signalHistoryTable.aiScore,
        tier: signalHistoryTable.tier,
        rrRatio: signalHistoryTable.rrRatio,
        openedAt: signalHistoryTable.openedAt,
      })
      .from(signalHistoryTable)
      .where(isNull(signalHistoryTable.closedAt));
    return rows as OpenTrade[];
  } catch (e) {
    logger.error({ e }, "paperTradeMonitor: failed to fetch open trades");
    return [];
  }
}

async function closeTrade(
  trade: OpenTrade,
  exitPrice: number,
  outcome: string,
  profitPct: number,
) {
  if (closingInProgress.has(trade.id)) return;
  closingInProgress.add(trade.id);

  try {
    await db
      .update(signalHistoryTable)
      .set({
        outcome,
        profitPct: profitPct.toFixed(4),
        closedAt: new Date(),
      })
      .where(eq(signalHistoryTable.id, trade.id));

    logger.info(
      { id: trade.id, symbol: trade.symbol, outcome, profitPct: profitPct.toFixed(2) },
      "paperTradeMonitor: trade auto-closed"
    );

    const event =
      outcome === "WIN_TP3" ? "TP3" :
      outcome === "WIN_TP2" ? "TP2" :
      outcome === "WIN_TP1" ? "TP1" : "SL";

    const tp3Val = trade.tp3 ? parseFloat(trade.tp3) : parseFloat(trade.tp2) * 1.01;
    const fakeSignal = {
      id: String(trade.id),
      pair: trade.symbol,
      direction: trade.direction as "LONG" | "SHORT",
      confidence: trade.aiScore,
      score: trade.aiScore,
      timeframe: "AUTO",
      entry: { low: parseFloat(trade.entryPrice), high: parseFloat(trade.entryPrice) },
      tp: [parseFloat(trade.tp1), parseFloat(trade.tp2), tp3Val] as [number, number, number],
      sl: parseFloat(trade.sl),
      rr: parseFloat(trade.rrRatio),
      status: outcome,
      timestamp: trade.openedAt.getTime(),
      factors: [],
      whaleActivity: false,
      entryWindowMinutes: 0,
      tier: trade.tier,
      tpHit: [false, false, false] as [boolean, boolean, boolean],
    };

    await notifyTpSlHit(fakeSignal, event, profitPct);
  } catch (e) {
    logger.error({ e, id: trade.id }, "paperTradeMonitor: failed to close trade");
  } finally {
    closingInProgress.delete(trade.id);
  }
}

async function checkTrades() {
  if (!isMonitorReady()) return;

  const openTrades = await fetchOpenTrades();
  if (openTrades.length === 0) return;

  for (const trade of openTrades) {
    if (closingInProgress.has(trade.id)) continue;

    const currentPrice = getLivePrice(trade.symbol);
    if (!currentPrice) continue;

    const entry = parseFloat(trade.entryPrice);
    const tp1 = parseFloat(trade.tp1);
    const tp2 = parseFloat(trade.tp2);
    const tp3 = parseFloat(trade.tp3 ?? "0");
    const sl = parseFloat(trade.sl);
    const isLong = trade.direction === "LONG";

    let outcome: string | null = null;
    let exitPrice = currentPrice;

    if (isLong) {
      if (tp3 > 0 && currentPrice >= tp3) {
        outcome = "WIN_TP3"; exitPrice = tp3;
      } else if (currentPrice >= tp2) {
        outcome = "WIN_TP2"; exitPrice = tp2;
      } else if (currentPrice >= tp1) {
        outcome = "WIN_TP1"; exitPrice = tp1;
      } else if (currentPrice <= sl) {
        outcome = "LOSS"; exitPrice = sl;
      }
    } else {
      if (tp3 > 0 && currentPrice <= tp3) {
        outcome = "WIN_TP3"; exitPrice = tp3;
      } else if (currentPrice <= tp2) {
        outcome = "WIN_TP2"; exitPrice = tp2;
      } else if (currentPrice <= tp1) {
        outcome = "WIN_TP1"; exitPrice = tp1;
      } else if (currentPrice >= sl) {
        outcome = "LOSS"; exitPrice = sl;
      }
    }

    if (outcome) {
      const mult = isLong ? 1 : -1;
      const profitPct = mult * ((exitPrice - entry) / entry) * 100;

      logger.info(
        {
          symbol: trade.symbol,
          direction: trade.direction,
          entry: entry.toFixed(4),
          current: currentPrice.toFixed(4),
          outcome,
          profitPct: profitPct.toFixed(2),
        },
        "paperTradeMonitor: TP/SL triggered"
      );

      await closeTrade(trade, exitPrice, outcome, profitPct);
    }
  }
}

export function startPaperTradeMonitor() {
  if (monitorTimer) return;
  monitorTimer = setInterval(() => {
    checkTrades().catch((e) =>
      logger.error({ e }, "paperTradeMonitor: checkTrades error")
    );
  }, CHECK_INTERVAL_MS);
  logger.info({ intervalMs: CHECK_INTERVAL_MS }, "paperTradeMonitor: started — checking every 3s");
}

export function stopPaperTradeMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  logger.info("paperTradeMonitor: stopped");
}
