import { db } from "@workspace/db";
import { referralsTable, subscribersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";

export function generateReferralCode(chatId: number): string {
  return "REF" + chatId.toString(36).toUpperCase();
}

export function parseChatIdFromCode(code: string): number | null {
  const stripped = code.replace(/^REF/i, "");
  const parsed = parseInt(stripped, 36);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
}

export async function ensureReferralCode(chatId: number): Promise<string> {
  const code = generateReferralCode(chatId);
  try {
    await db
      .update(subscribersTable)
      .set({ referralCode: code, updatedAt: new Date() })
      .where(eq(subscribersTable.chatId, chatId));
  } catch (e) {
    logger.error({ e, chatId }, "Failed to set referral code");
  }
  return code;
}

export async function recordReferral(
  referrerChatId: number,
  referredChatId: number,
): Promise<boolean> {
  if (referrerChatId === referredChatId) return false;

  try {
    const existing = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referredChatId, referredChatId));

    if (existing.length > 0) return false;

    await db.insert(referralsTable).values({
      referrerChatId,
      referredChatId,
      status: "pending",
    });

    logger.info({ referrerChatId, referredChatId }, "Referral recorded");
    return true;
  } catch (e) {
    logger.error({ e, referrerChatId, referredChatId }, "Failed to record referral");
    return false;
  }
}

export async function completeReferral(referredChatId: number): Promise<number | null> {
  try {
    const [row] = await db
      .update(referralsTable)
      .set({
        status: "rewarded",
        rewardNote: "7 days free VIP extension",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(referralsTable.referredChatId, referredChatId),
          eq(referralsTable.status, "pending"),
        ),
      )
      .returning({ referrerChatId: referralsTable.referrerChatId });

    if (!row) return null;

    logger.info({ referredChatId, referrerChatId: row.referrerChatId }, "Referral rewarded");
    return row.referrerChatId;
  } catch (e) {
    logger.error({ e, referredChatId }, "Failed to complete referral");
    return null;
  }
}

export async function getReferralStats(chatId: number): Promise<{
  code: string;
  link: string;
  total: number;
  converted: number;
  pending: number;
}> {
  const code = generateReferralCode(chatId);
  const botUsername = process.env["BOT_USERNAME"] ?? "Strongsmartsignal_bot";
  const link = `https://t.me/${botUsername}?start=${code}`;

  try {
    const rows = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerChatId, chatId));

    const converted = rows.filter((r) => r.status === "rewarded").length;
    const pending = rows.filter((r) => r.status === "pending").length;

    return { code, link, total: rows.length, converted, pending };
  } catch (e) {
    logger.error({ e, chatId }, "Failed to get referral stats");
    return { code, link, total: 0, converted: 0, pending: 0 };
  }
}

export async function getGlobalReferralStats(): Promise<{
  totalReferrals: number;
  converted: number;
  pending: number;
  topReferrers: { chatId: number; count: number }[];
}> {
  try {
    const rows = await db.select().from(referralsTable);
    const converted = rows.filter((r) => r.status === "rewarded").length;
    const pending = rows.filter((r) => r.status === "pending").length;

    const countMap = new Map<number, number>();
    for (const r of rows) {
      countMap.set(r.referrerChatId, (countMap.get(r.referrerChatId) ?? 0) + 1);
    }
    const topReferrers = [...countMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([chatId, count]) => ({ chatId, count }));

    return { totalReferrals: rows.length, converted, pending, topReferrers };
  } catch (e) {
    logger.error({ e }, "Failed to get global referral stats");
    return { totalReferrals: 0, converted: 0, pending: 0, topReferrers: [] };
  }
}
