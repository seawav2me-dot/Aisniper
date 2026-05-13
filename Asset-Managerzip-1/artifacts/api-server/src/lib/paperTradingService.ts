import { db } from "@workspace/db";
import { signalHistoryTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "./logger";
import { notifyTpSlHit } from "./alertService";
import type { ApiSignal } from "./signalHistoryService";

export interface PaperTradeRecord {
  id: number;
  symbol: string;
  direction: string;
  tier: string;
  aiScore: number;
  entryPrice: string;
  tp1: string;
  tp2: string;
  tp3: string;
  sl: string;
  rrRatio: string;
  outcome: string | null;
  profitPct: string | null;
  openedAt: Date;
  closedAt: Date | null;
}

export interface WeeklyStats {
  weekLabel: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  profitOn100: number;
}

export interface PerformanceSummary {
  weekly: WeeklyStats[];
  monthly: {
    period: string;
    label: string;
    totalSignals: number;
    wins: number;
    losses: number;
    winRate: number;
    profitOn100: number;
  }[];
  allTime: {
    totalSignals: number;
    wins: number;
    losses: number;
    winRate: number;
    totalProfit: number;
    bestMonth: string;
  };
}

export async function autoRegisterPaperTrade(signal: ApiSignal): Promise<void> {
  if (signal.confidence < 85) return;
  try {
    const existing = await db
      .select({ id: signalHistoryTable.id })
      .from(signalHistoryTable)
      .where(eq(signalHistoryTable.symbol, signal.pair))
      .limit(1);

    const recentOpen = existing.length > 0;
    if (recentOpen) {
      logger.info({ pair: signal.pair }, "paperTradingService: signal already exists, skipping auto-register");
    }

    const rrRatio = signal.rr.toFixed(2);
    await db.insert(signalHistoryTable).values({
      symbol: signal.pair,
      direction: signal.direction,
      tier: signal.tier,
      aiScore: signal.confidence,
      entryPrice: signal.entry.high.toFixed(8),
      tp1: signal.tp[0].toFixed(8),
      tp2: signal.tp[1].toFixed(8),
      tp3: signal.tp[2].toFixed(8),
      sl: signal.sl.toFixed(8),
      rrRatio,
      outcome: null,
      profitPct: null,
      openedAt: new Date(signal.timestamp),
      closedAt: null,
    });

    logger.info(
      { pair: signal.pair, confidence: signal.confidence },
      "paperTradingService: auto-registered paper trade"
    );
  } catch (e) {
    logger.error({ e, pair: signal.pair }, "paperTradingService: failed to auto-register");
  }
}

export async function closePaperTradeWithOutcome(
  signal: ApiSignal,
  event: "TP1" | "TP2" | "TP3" | "SL"
): Promise<void> {
  try {
    const entryPrice = signal.entry.high;
    let exitPrice: number;
    let outcome: string;
    let profitPct: number;

    const mult = signal.direction === "LONG" ? 1 : -1;

    if (event === "TP1") {
      exitPrice = signal.tp[0];
      outcome = "WIN_TP1";
      profitPct = mult * ((exitPrice - entryPrice) / entryPrice) * 100;
    } else if (event === "TP2") {
      exitPrice = signal.tp[1];
      outcome = "WIN_TP2";
      profitPct = mult * ((exitPrice - entryPrice) / entryPrice) * 100;
    } else if (event === "TP3") {
      exitPrice = signal.tp[2];
      outcome = "WIN_TP3";
      profitPct = mult * ((exitPrice - entryPrice) / entryPrice) * 100;
    } else {
      exitPrice = signal.sl;
      outcome = "LOSS";
      profitPct = mult * ((exitPrice - entryPrice) / entryPrice) * 100;
    }

    const openRow = await db
      .select({ id: signalHistoryTable.id })
      .from(signalHistoryTable)
      .where(
        sql`symbol = ${signal.pair} AND closed_at IS NULL`
      )
      .orderBy(desc(signalHistoryTable.openedAt))
      .limit(1);

    if (openRow.length === 0) {
      logger.warn({ pair: signal.pair }, "paperTradingService: no open trade found to close");
      return;
    }

    await db
      .update(signalHistoryTable)
      .set({
        outcome,
        profitPct: profitPct.toFixed(4),
        closedAt: new Date(),
      })
      .where(eq(signalHistoryTable.id, openRow[0]!.id));

    await notifyTpSlHit(signal, event, profitPct);

    logger.info({ pair: signal.pair, event, profitPct }, "paperTradingService: trade closed");
  } catch (e) {
    logger.error({ e, pair: signal.pair, event }, "paperTradingService: failed to close trade");
  }
}

export async function getWeeklyStats(weeks = 8): Promise<WeeklyStats[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', opened_at), 'YYYY-MM-DD') AS week_start,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN outcome != 'LOSS' THEN 1 END)::int AS wins,
        ROUND(SUM(profit_pct::numeric), 2)::float AS total_profit_pct
      FROM signal_history
      WHERE closed_at IS NOT NULL
        AND opened_at >= NOW() - INTERVAL '${sql.raw(String(weeks))} weeks'
      GROUP BY DATE_TRUNC('week', opened_at)
      ORDER BY week_start DESC
      LIMIT ${weeks}
    `);

    return (
      result.rows as Array<{
        week_start: string;
        total: number;
        wins: number;
        total_profit_pct: number;
      }>
    ).map((row) => {
      const losses = row.total - row.wins;
      const winRate = row.total > 0 ? Math.round((row.wins / row.total) * 100) : 0;
      const profitOn100 = Math.round(row.total_profit_pct ?? 0);
      const date = new Date(row.week_start);
      const weekLabel = `${date.getDate()}/${date.getMonth() + 1}`;
      return { weekLabel, totalSignals: row.total, wins: row.wins, losses, winRate, profitOn100 };
    });
  } catch {
    return [];
  }
}

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const weekly = await getWeeklyStats(8);

  let monthly: PerformanceSummary["monthly"] = [];
  let allTime: PerformanceSummary["allTime"] = {
    totalSignals: 0, wins: 0, losses: 0, winRate: 0, totalProfit: 0, bestMonth: "",
  };

  const MONTH_NAMES_AR = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];

  try {
    const mResult = await db.execute(sql`
      SELECT
        TO_CHAR(opened_at, 'YYYY-MM') AS period,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN outcome != 'LOSS' THEN 1 END)::int AS wins,
        ROUND(SUM(profit_pct::numeric), 2)::float AS total_profit_pct
      FROM signal_history
      WHERE closed_at IS NOT NULL
      GROUP BY TO_CHAR(opened_at, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 6
    `);

    monthly = (
      mResult.rows as Array<{
        period: string;
        total: number;
        wins: number;
        total_profit_pct: number;
      }>
    ).map((row) => {
      const losses = row.total - row.wins;
      const winRate = row.total > 0 ? Math.round((row.wins / row.total) * 100) : 0;
      const profitOn100 = Math.round(row.total_profit_pct ?? 0);
      const [year, month] = row.period.split("-");
      const label = `${MONTH_NAMES_AR[parseInt(month ?? "1") - 1] ?? ""} ${year ?? ""}`;
      return { period: row.period, label, totalSignals: row.total, wins: row.wins, losses, winRate, profitOn100 };
    });

    const atResult = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN outcome != 'LOSS' THEN 1 END)::int AS wins,
        ROUND(SUM(profit_pct::numeric), 2)::float AS total_profit
      FROM signal_history
      WHERE closed_at IS NOT NULL
    `);

    const atRow = atResult.rows[0] as {
      total: number; wins: number; total_profit: number;
    } | undefined;

    if (atRow) {
      const losses = atRow.total - atRow.wins;
      const winRate = atRow.total > 0 ? Math.round((atRow.wins / atRow.total) * 100) : 0;
      const bestMonth = monthly.length > 0
        ? monthly.reduce((best, m) => m.profitOn100 > best.profitOn100 ? m : best, monthly[0]!).label
        : "";

      allTime = {
        totalSignals: atRow.total,
        wins: atRow.wins,
        losses,
        winRate,
        totalProfit: Math.round(atRow.total_profit ?? 0),
        bestMonth,
      };
    }
  } catch (e) {
    logger.error({ e }, "getPerformanceSummary: DB error");
  }

  return { weekly, monthly, allTime };
}

export async function getSignalHistory(limit = 50): Promise<PaperTradeRecord[]> {
  try {
    return await db
      .select()
      .from(signalHistoryTable)
      .orderBy(desc(signalHistoryTable.openedAt))
      .limit(limit) as PaperTradeRecord[];
  } catch {
    return [];
  }
}
