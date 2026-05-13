import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendMessage } from "./telegram";
import { MSG } from "./botMessages";
import { logger } from "./logger";
import { getLiveMarketData, formatPrice } from "./priceService";
import { getPerformanceSummary } from "./paperTradingService";

type BroadcastType = "signals" | "market" | "whales" | "scanner";

function getInterval(type: BroadcastType): number {
  switch (type) {
    case "signals": return 4 * 60 * 60 * 1000;
    case "market":  return 2 * 60 * 60 * 1000;
    case "whales":  return 1 * 60 * 60 * 1000;
    case "scanner": return 6 * 60 * 60 * 1000;
  }
}

async function getMessage(type: BroadcastType): Promise<string> {
  if (type === "market") {
    const live = await getLiveMarketData();
    if (live) {
      return MSG.market(
        live.marketStatus,
        formatPrice(live.btc),
        live.fearGreed,
        live.winRate,
      );
    }
  }
  switch (type) {
    case "signals": return MSG.signals;
    case "market":  return MSG.market("BULLISH", "67,340", 71, 87);
    case "whales":  return MSG.whales;
    case "scanner": return MSG.scanner;
  }
}

async function getActiveSubscribers(vipOnly = false) {
  if (vipOnly) {
    return db
      .select()
      .from(subscribersTable)
      .where(eq(subscribersTable.isActive, true));
  }
  return db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.isActive, true));
}

export async function broadcast(type: BroadcastType, vipOnly = false): Promise<number> {
  let subscribers: Awaited<ReturnType<typeof getActiveSubscribers>>;

  try {
    subscribers = await getActiveSubscribers(vipOnly);
  } catch (e) {
    logger.error({ e }, "broadcast: failed to fetch subscribers");
    return 0;
  }

  if (subscribers.length === 0) return 0;

  const message = await getMessage(type);
  let sent = 0;

  for (const sub of subscribers) {
    if (vipOnly && sub.tier === "free") continue;
    try {
      await sendMessage(sub.chatId, message);
      sent++;
      await new Promise((r) => setTimeout(r, 50));
    } catch (e) {
      logger.error({ e, chatId: sub.chatId }, "broadcast: failed to send message");
    }
  }

  logger.info({ type, sent, total: subscribers.length }, "Broadcast complete");
  return sent;
}

const timers: NodeJS.Timeout[] = [];

async function sendWeeklyPerformanceReport(): Promise<void> {
  try {
    const summary = await getPerformanceSummary();
    const weekly = summary.weekly;
    if (!weekly || weekly.length === 0) return;

    const latest = weekly[0]!;
    const admin = process.env["ADMIN_CHAT_ID"] ? Number(process.env["ADMIN_CHAT_ID"]) : null;

    let vipSubscribers: { chatId: number; tier: string }[] = [];
    try {
      const rows = await db.select().from(subscribersTable).where(eq(subscribersTable.isActive, true));
      vipSubscribers = rows.filter((r) => r.tier !== "free");
    } catch {}

    const msg = `┌─────────────────────────────┐
│  📊 <b>تقرير الأداء الأسبوعي</b>       │
│  AI SNIPER PRO MAX           │
└─────────────────────────────┘

<b>أسبوع ${latest.weekLabel}</b>

📈 الإجمالي: <b>${latest.totalSignals} صفقة</b>
✅ نجح: <b>${latest.wins}</b>  ❌ خسر: <b>${latest.losses}</b>
🎯 نسبة النجاح: <b>${latest.winRate}%</b>
💰 الربح على $100: <b>+$${latest.profitOn100}</b>

────────────────────────
<b>الإجمالي الكلي:</b>
صفقات: <b>${summary.allTime.totalSignals}</b>  |  نجاح: <b>${summary.allTime.winRate}%</b>
أفضل شهر: <b>${summary.allTime.bestMonth}</b>

<i>جميع النتائج مسجّلة في التداول الوهمي ✅</i>
/signals — الإشارات النشطة`;

    if (admin) {
      try { await sendMessage(admin, msg); } catch {}
    }
    for (const sub of vipSubscribers) {
      try {
        await sendMessage(sub.chatId, msg);
        await new Promise((r) => setTimeout(r, 60));
      } catch {}
    }
    logger.info({ sent: vipSubscribers.length }, "Weekly performance report sent");
  } catch (e) {
    logger.error({ e }, "Scheduler: weekly performance report failed");
  }
}

async function sendMonthlyPerformanceReport(): Promise<void> {
  try {
    const summary = await getPerformanceSummary();
    const monthly = summary.monthly;
    if (!monthly || monthly.length === 0) return;

    const latest = monthly[0]!;
    const admin = process.env["ADMIN_CHAT_ID"] ? Number(process.env["ADMIN_CHAT_ID"]) : null;

    let vipSubscribers: { chatId: number; tier: string }[] = [];
    try {
      const rows = await db.select().from(subscribersTable).where(eq(subscribersTable.isActive, true));
      vipSubscribers = rows.filter((r) => r.tier !== "free");
    } catch {}

    const msg = `┌─────────────────────────────┐
│  🏆 <b>تقرير الأداء الشهري</b>         │
│  AI SNIPER PRO MAX           │
└─────────────────────────────┘

<b>${latest.label}</b>

📈 إجمالي الصفقات: <b>${latest.totalSignals}</b>
✅ نجح: <b>${latest.wins}</b>  ❌ خسر: <b>${latest.losses}</b>
🎯 نسبة النجاح: <b>${latest.winRate}%</b>
💰 الربح على $100 لكل صفقة: <b>+$${latest.profitOn100}</b>

────────────────────────
<b>الكلي منذ البداية:</b>
${summary.allTime.totalSignals} صفقة  |  ${summary.allTime.winRate}% نجاح
إجمالي الربح: <b>+$${summary.allTime.totalProfit}</b> على $100

<i>التداول الوهمي يثبت دقة الإشارات 📊</i>
/vip — اشترك وابدأ الربح الحقيقي`;

    if (admin) {
      try { await sendMessage(admin, msg); } catch {}
    }
    for (const sub of vipSubscribers) {
      try {
        await sendMessage(sub.chatId, msg);
        await new Promise((r) => setTimeout(r, 60));
      } catch {}
    }
    logger.info({ sent: vipSubscribers.length }, "Monthly performance report sent");
  } catch (e) {
    logger.error({ e }, "Scheduler: monthly performance report failed");
  }
}

export function startScheduler() {
  const schedules: { type: BroadcastType; vipOnly: boolean }[] = [
    { type: "signals", vipOnly: false },
    { type: "market",  vipOnly: false },
    { type: "whales",  vipOnly: true  },
    { type: "scanner", vipOnly: true  },
  ];

  for (const { type, vipOnly } of schedules) {
    const interval = getInterval(type);
    const label = `${type}${vipOnly ? " (VIP)" : ""}`;

    const timer = setInterval(async () => {
      logger.info({ type, vipOnly }, "Scheduler: starting broadcast");
      const sent = await broadcast(type, vipOnly);
      logger.info({ type, sent }, `Scheduler: broadcast done`);
    }, interval);

    timers.push(timer);
    logger.info({ label, intervalMs: interval }, "Scheduler: registered broadcast job");
  }

  const weeklyTimer = setInterval(async () => {
    logger.info("Scheduler: sending weekly performance report");
    await sendWeeklyPerformanceReport();
  }, 7 * 24 * 60 * 60 * 1000);
  timers.push(weeklyTimer);

  const monthlyTimer = setInterval(async () => {
    logger.info("Scheduler: sending monthly performance report");
    await sendMonthlyPerformanceReport();
  }, 30 * 24 * 60 * 60 * 1000);
  timers.push(monthlyTimer);

  logger.info({ jobs: schedules.length + 2 }, "Scheduler started");
}

export function stopScheduler() {
  for (const t of timers) clearInterval(t);
  timers.length = 0;
  logger.info("Scheduler stopped");
}
