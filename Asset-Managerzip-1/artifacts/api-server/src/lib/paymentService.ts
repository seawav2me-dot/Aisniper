import { db } from "@workspace/db";
import { paymentsTable, subscribersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { completeReferral } from "./referralService";

export async function createPendingPayment(
  chatId: number,
  firstName: string,
  username: string | undefined,
  fileId: string,
  tier = "vip",
): Promise<number | null> {
  try {
    const [row] = await db
      .insert(paymentsTable)
      .values({ chatId, firstName, username: username ?? null, fileId, tier, status: "pending" })
      .returning({ id: paymentsTable.id });
    logger.info({ chatId, paymentId: row?.id }, "Payment record created");
    return row?.id ?? null;
  } catch (e) {
    logger.error({ e, chatId }, "Failed to create payment record");
    return null;
  }
}

export async function approvePayment(
  chatId: number,
  tier: string,
  adminId: number,
): Promise<{ name: string; tier: string; referrerChatId: number | null } | null> {
  try {
    await db
      .update(paymentsTable)
      .set({ status: "approved", reviewedBy: adminId, updatedAt: new Date() })
      .where(and(eq(paymentsTable.chatId, chatId), eq(paymentsTable.status, "pending")));

    const [sub] = await db
      .update(subscribersTable)
      .set({ tier, isActive: true, updatedAt: new Date() })
      .where(eq(subscribersTable.chatId, chatId))
      .returning({ firstName: subscribersTable.firstName, tier: subscribersTable.tier });

    if (!sub) {
      logger.warn({ chatId }, "approvePayment: subscriber not found, skipping tier update");
      return null;
    }

    const referrerChatId = await completeReferral(chatId);

    logger.info({ chatId, tier, adminId, referrerChatId }, "Payment approved and tier upgraded");
    return { name: sub.firstName, tier: sub.tier, referrerChatId };
  } catch (e) {
    logger.error({ e, chatId }, "Failed to approve payment");
    return null;
  }
}

export async function rejectPayment(
  chatId: number,
  adminId: number,
): Promise<string | null> {
  try {
    await db
      .update(paymentsTable)
      .set({ status: "rejected", reviewedBy: adminId, updatedAt: new Date() })
      .where(and(eq(paymentsTable.chatId, chatId), eq(paymentsTable.status, "pending")));

    const [sub] = await db
      .select({ firstName: subscribersTable.firstName })
      .from(subscribersTable)
      .where(eq(subscribersTable.chatId, chatId));

    logger.info({ chatId, adminId }, "Payment rejected");
    return sub?.firstName ?? null;
  } catch (e) {
    logger.error({ e, chatId }, "Failed to reject payment");
    return null;
  }
}

export async function getPendingPaymentCount(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.status, "pending"));
    return rows.length;
  } catch {
    return 0;
  }
}
