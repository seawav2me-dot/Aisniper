import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { generateReferralCode } from "./referralService";

export async function upsertSubscriber(
  chatId: number,
  firstName: string,
  username?: string,
  tier = "free",
) {
  try {
    const referralCode = generateReferralCode(chatId);
    await db
      .insert(subscribersTable)
      .values({ chatId, firstName, username: username ?? null, tier, isActive: true, referralCode })
      .onConflictDoUpdate({
        target: subscribersTable.chatId,
        set: {
          firstName,
          username: username ?? null,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    logger.info({ chatId, tier }, "Subscriber upserted");
  } catch (e) {
    logger.error({ e, chatId }, "Failed to upsert subscriber");
  }
}

export async function deactivateSubscriber(chatId: number) {
  try {
    await db
      .update(subscribersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(subscribersTable.chatId, chatId));
    logger.info({ chatId }, "Subscriber deactivated");
  } catch (e) {
    logger.error({ e, chatId }, "Failed to deactivate subscriber");
  }
}

export async function getSubscriberCount(): Promise<{ total: number; vip: number; free: number }> {
  try {
    const rows = await db
      .select()
      .from(subscribersTable)
      .where(eq(subscribersTable.isActive, true));

    const vip = rows.filter((r) => r.tier !== "free").length;
    return { total: rows.length, vip, free: rows.length - vip };
  } catch (e) {
    logger.error({ e }, "Failed to get subscriber count");
    return { total: 0, vip: 0, free: 0 };
  }
}

export async function getSubscriberName(chatId: number): Promise<string | null> {
  try {
    const [row] = await db
      .select({ firstName: subscribersTable.firstName })
      .from(subscribersTable)
      .where(eq(subscribersTable.chatId, chatId));
    return row?.firstName ?? null;
  } catch {
    return null;
  }
}

export async function getAllActiveSubscriberChatIds(): Promise<number[]> {
  try {
    const rows = await db
      .select({ chatId: subscribersTable.chatId })
      .from(subscribersTable)
      .where(eq(subscribersTable.isActive, true));
    return rows.map((r) => r.chatId);
  } catch (e) {
    logger.error({ e }, "Failed to get active subscriber chat IDs");
    return [];
  }
}
