import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export type QuotaFeature =
  | "signals"
  | "scanner"
  | "analyze"
  | "price"
  | "market"
  | "whale"
  | "paper_trade";

const FREE_DAILY_LIMIT = 2;
const PAPER_TRADE_DELAY_MS = 30 * 60 * 1000;

const dailyUsage = new Map<string, number>();
const lastPaperTrade = new Map<number, number>();
const paperTradeCount = new Map<number, number>();

function todayKey(chatId: number, feature: QuotaFeature): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${chatId}:${feature}:${date}`;
}

async function isVip(chatId: number): Promise<boolean> {
  try {
    const [row] = await db
      .select({ tier: subscribersTable.tier })
      .from(subscribersTable)
      .where(eq(subscribersTable.chatId, chatId));
    return row ? row.tier !== "free" : false;
  } catch {
    return false;
  }
}

export async function checkQuota(
  chatId: number,
  feature: QuotaFeature,
): Promise<{ allowed: boolean; remaining: number; resetMsg: string }> {
  const vip = await isVip(chatId);
  if (vip) return { allowed: true, remaining: 999, resetMsg: "" };

  const key = todayKey(chatId, feature);
  const used = dailyUsage.get(key) ?? 0;

  if (used >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetMsg: "⏰ انتهى حد اليوم المجاني (2 مرات). يتجدد في منتصف الليل.",
    };
  }

  dailyUsage.set(key, used + 1);
  return { allowed: true, remaining: FREE_DAILY_LIMIT - used - 1, resetMsg: "" };
}

export async function checkPaperTradeQuota(
  chatId: number,
): Promise<{ allowed: boolean; delayMs: number; countUsed: number }> {
  const vip = await isVip(chatId);
  if (vip) return { allowed: true, delayMs: 0, countUsed: 0 };

  const count = paperTradeCount.get(chatId) ?? 0;
  if (count >= FREE_DAILY_LIMIT) {
    return { allowed: false, delayMs: 0, countUsed: count };
  }

  const lastTime = lastPaperTrade.get(chatId) ?? 0;
  const elapsed = Date.now() - lastTime;
  if (lastTime > 0 && elapsed < PAPER_TRADE_DELAY_MS) {
    const remaining = PAPER_TRADE_DELAY_MS - elapsed;
    return { allowed: false, delayMs: remaining, countUsed: count };
  }

  lastPaperTrade.set(chatId, Date.now());
  paperTradeCount.set(chatId, count + 1);
  logger.info({ chatId, count: count + 1 }, "freeQuota: paper trade registered");
  return { allowed: true, delayMs: 0, countUsed: count + 1 };
}

export function resetPaperTradeCount(chatId: number): void {
  paperTradeCount.delete(chatId);
  lastPaperTrade.delete(chatId);
}

setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() < 5) {
    dailyUsage.clear();
    paperTradeCount.clear();
    lastPaperTrade.clear();
    logger.info("freeQuotaService: daily reset done");
  }
}, 5 * 60 * 1000);

export async function checkSignalQuota(
  chatId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const r = await checkQuota(chatId, "signals");
  return { allowed: r.allowed, remaining: r.remaining };
}

export async function checkScanQuota(
  chatId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const r = await checkQuota(chatId, "scanner");
  return { allowed: r.allowed, remaining: r.remaining };
}
