import { db } from "@workspace/db";
import { signalHistoryTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

export interface PeriodStat {
  period: string;
  label: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  profitOn100: number;
}

export interface ApiSignal {
  id: string;
  pair: string;
  direction: "LONG" | "SHORT";
  confidence: number;
  score: number;
  timeframe: string;
  entry: { low: number; high: number };
  tp: [number, number, number];
  sl: number;
  rr: number;
  status: string;
  timestamp: number;
  factors: string[];
  whaleActivity: boolean;
  entryWindowMinutes: number;
  tier: string;
  tpHit: [boolean, boolean, boolean];
  updateMessage?: string;
}

const SIGNAL_TEMPLATES: Array<Omit<ApiSignal, "timestamp"> & { offsetMs: number }> = [
  {
    id: "1",
    pair: "BTCUSDT",
    direction: "LONG",
    confidence: 94,
    score: 94,
    timeframe: "4H",
    entry: { low: 80200, high: 80500 },
    tp: [81400, 82800, 84500],
    sl: 79100,
    rr: 3.5,
    status: "ACTIVE",
    factors: ["Order Block مؤسسي", "BOS بقوة", "تجمع الحيتان", "ضغط ATR منخفض", "4H صعودي"],
    whaleActivity: true,
    entryWindowMinutes: 8,
    tier: "EXTREME_SNIPER",
    tpHit: [false, false, false],
    offsetMs: 5 * 60 * 1000,
  },
  {
    id: "2",
    pair: "ETHUSDT",
    direction: "LONG",
    confidence: 91,
    score: 91,
    timeframe: "4H",
    entry: { low: 2450, high: 2465 },
    tp: [2510, 2580, 2680],
    sl: 2418,
    rr: 3.8,
    status: "TP1_HIT",
    factors: ["اصطياد السيولة", "BOS صعودي", "إعادة اختبار Order Block", "حجم مرتفع", "دعم BTC"],
    whaleActivity: true,
    entryWindowMinutes: 18,
    tier: "EXTREME_SNIPER",
    tpHit: [true, false, false],
    updateMessage: "هدف 1 تحقق — انقل وقف الخسارة لنقطة التعادل",
    offsetMs: 45 * 60 * 1000,
  },
  {
    id: "3",
    pair: "SOLUSDT",
    direction: "LONG",
    confidence: 87,
    score: 87,
    timeframe: "1H",
    entry: { low: 142.5, high: 144.0 },
    tp: [148.0, 153.5, 162.0],
    sl: 138.8,
    rr: 3.8,
    status: "ACTIVE",
    factors: ["CHoCH مؤكد", "Fair Value Gap", "ارتفاع الحجم", "ارتباط BTC"],
    whaleActivity: true,
    entryWindowMinutes: 25,
    tier: "HIGH_MOMENTUM",
    tpHit: [false, false, false],
    offsetMs: 22 * 60 * 1000,
  },
  {
    id: "4",
    pair: "XRPUSDT",
    direction: "LONG",
    confidence: 74,
    score: 74,
    timeframe: "4H",
    entry: { low: 1.4199, high: 1.4393 },
    tp: [1.4588, 1.485, 1.52],
    sl: 1.394,
    rr: 1.5,
    status: "ACTIVE",
    factors: ["كسر هيكل صعودي", "منطقة دعم مؤسسية", "ارتفاع حجم التداول"],
    whaleActivity: false,
    entryWindowMinutes: 45,
    tier: "MEDIUM",
    tpHit: [false, false, false],
    offsetMs: 12 * 60 * 1000,
  },
  {
    id: "5",
    pair: "BNBUSDT",
    direction: "SHORT",
    confidence: 82,
    score: 82,
    timeframe: "1H",
    entry: { low: 585, high: 588 },
    tp: [578, 568, 555],
    sl: 594,
    rr: 2.9,
    status: "CLOSED_WIN",
    factors: ["CHoCH هبوطي", "رفض مقاومة", "دلتا حجم سلبية"],
    whaleActivity: false,
    entryWindowMinutes: 0,
    tier: "HIGH_MOMENTUM",
    tpHit: [true, true, false],
    offsetMs: 3 * 60 * 60 * 1000,
  },
  {
    id: "6",
    pair: "AVAXUSDT",
    direction: "LONG",
    confidence: 78,
    score: 78,
    timeframe: "4H",
    entry: { low: 34.2, high: 34.8 },
    tp: [36.0, 37.5, 39.2],
    sl: 33.1,
    rr: 3.2,
    status: "CLOSED_WIN",
    factors: ["ملء FVG", "دعم EMA 50", "تعافي Stochastic RSI"],
    whaleActivity: false,
    entryWindowMinutes: 0,
    tier: "MEDIUM",
    tpHit: [true, true, true],
    offsetMs: 6 * 60 * 60 * 1000,
  },
  {
    id: "7",
    pair: "LINKUSDT",
    direction: "SHORT",
    confidence: 84,
    score: 84,
    timeframe: "15M",
    entry: { low: 14.8, high: 15.1 },
    tp: [14.2, 13.6, 12.9],
    sl: 15.6,
    rr: 3.1,
    status: "ACTIVE",
    factors: ["اصطياد القمم المتساوية", "BOS هبوطي", "تخفيف Order Block", "ارتفاع الحجم النسبي"],
    whaleActivity: false,
    entryWindowMinutes: 40,
    tier: "HIGH_MOMENTUM",
    tpHit: [false, false, false],
    offsetMs: 30 * 60 * 1000,
  },
];

export function getActiveSignals(): ApiSignal[] {
  const now = Date.now();
  return SIGNAL_TEMPLATES.map(({ offsetMs, ...t }) => ({
    ...t,
    timestamp: now - offsetMs,
  }));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export async function seedIfEmpty(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT COUNT(*)::int AS count FROM signal_history`);
    const row = result.rows[0] as { count: number } | undefined;
    if ((row?.count ?? 0) > 0) return;
    await insertSeedData();
  } catch {
    // Table may not exist yet during first boot — auto-migrate will create it
  }
}

async function insertSeedData(): Promise<void> {
  const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BNBUSDT", "LINKUSDT", "AVAXUSDT", "ARBUSDT"];
  const basePrices: Record<string, number> = {
    BTCUSDT: 92000, ETHUSDT: 2800, SOLUSDT: 155,
    XRPUSDT: 1.8, BNBUSDT: 600, LINKUSDT: 15.5,
    AVAXUSDT: 36, ARBUSDT: 1.1,
  };

  const entries: (typeof signalHistoryTable.$inferInsert)[] = [];
  let s = 42;

  for (let daysAgo = 90; daysAgo >= 2; daysAgo--) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const signalsCount = seededRandom(s++) > 0.45 ? 3 : 2;

    for (let i = 0; i < signalsCount; i++) {
      const sym = symbols[Math.floor(seededRandom(s++) * symbols.length)]!;
      const base = basePrices[sym]!;
      const priceVar = 0.82 + seededRandom(s++) * 0.36;
      const entry = base * priceVar;

      const direction = seededRandom(s++) > 0.3 ? "LONG" : "SHORT";
      const tierRnd = seededRandom(s++);
      const tier = tierRnd < 0.30 ? "EXTREME_SNIPER" : tierRnd < 0.75 ? "HIGH_MOMENTUM" : "MEDIUM";
      const aiScore = 78 + Math.floor(seededRandom(s++) * 22);

      const tp1Pct = 0.015 + seededRandom(s++) * 0.015;
      const tp2Pct = tp1Pct + 0.01 + seededRandom(s++) * 0.02;
      const tp3Pct = tp2Pct + 0.02 + seededRandom(s++) * 0.04;
      const slPct = 0.01 + seededRandom(s++) * 0.015;

      const mult = direction === "LONG" ? 1 : -1;
      const tp1 = entry * (1 + mult * tp1Pct);
      const tp2 = entry * (1 + mult * tp2Pct);
      const tp3 = entry * (1 + mult * tp3Pct);
      const sl = entry * (1 - mult * slPct);
      const rr = tp2Pct / slPct;

      const outcomeRnd = seededRandom(s++);
      let outcome: string;
      let profitPct: number;

      if (outcomeRnd < 0.50) {
        outcome = "WIN_TP1"; profitPct = tp1Pct * 100;
      } else if (outcomeRnd < 0.75) {
        outcome = "WIN_TP2"; profitPct = tp2Pct * 100;
      } else if (outcomeRnd < 0.87) {
        outcome = "WIN_TP3"; profitPct = tp3Pct * 100;
      } else {
        outcome = "LOSS"; profitPct = -(slPct * 100);
      }

      const openHour = 2 + Math.floor(seededRandom(s++) * 20);
      const openMin = Math.floor(seededRandom(s++) * 60);
      const openedAt = new Date(date);
      openedAt.setHours(openHour, openMin, 0, 0);
      const closedAt = new Date(openedAt);
      closedAt.setHours(closedAt.getHours() + 1 + Math.floor(seededRandom(s++) * 7));

      entries.push({
        symbol: sym,
        direction,
        tier,
        aiScore,
        entryPrice: entry.toFixed(8),
        tp1: tp1.toFixed(8),
        tp2: tp2.toFixed(8),
        tp3: tp3.toFixed(8),
        sl: sl.toFixed(8),
        rrRatio: rr.toFixed(2),
        outcome,
        profitPct: profitPct.toFixed(4),
        openedAt,
        closedAt,
      });
    }
  }

  for (let i = 0; i < entries.length; i += 50) {
    await db.insert(signalHistoryTable).values(entries.slice(i, i + 50));
  }
}

const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export async function getMonthlyStats(limit = 6): Promise<PeriodStat[]> {
  try {
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(opened_at, 'YYYY-MM') AS period,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN outcome != 'LOSS' THEN 1 END)::int AS wins,
        ROUND(SUM(profit_pct::numeric), 2)::float AS total_profit_pct
      FROM signal_history
      WHERE closed_at IS NOT NULL
      GROUP BY TO_CHAR(opened_at, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT ${limit}
    `);

    return (
      result.rows as Array<{
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
  } catch {
    return [];
  }
}

export async function getLatestMonthSummary(): Promise<string> {
  const stats = await getMonthlyStats(1);
  if (!stats.length) return "";
  const s = stats[0]!;
  return `📈 ${s.label}: ${s.totalSignals} صفقة | نسبة نجاح ${s.winRate}% | +$${s.profitOn100} على $100 لكل صفقة`;
}
