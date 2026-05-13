import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const FREE_LIMIT = 2;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getSub(chatId: number) {
  const [row] = await db
    .select()
    .from(subscribersTable)
    .where(eq(subscribersTable.chatId, chatId));
  return row ?? null;
}

export async function checkSignalQuota(
  chatId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const sub = await getSub(chatId);
  if (!sub) return { allowed: false, remaining: 0 };
  if (sub.tier !== "free") return { allowed: true, remaining: 999 };

  const today = todayStr();
  const needsReset = sub.lastQuotaDate !== today;
  const used = needsReset ? 0 : (sub.freeSignalsToday ?? 0);

  if (used >= FREE_LIMIT) return { allowed: false, remaining: 0 };

  await db
    .update(subscribersTable)
    .set({
      freeSignalsToday: used + 1,
      lastQuotaDate: today,
      updatedAt: new Date(),
    })
    .where(eq(subscribersTable.chatId, chatId));

  return { allowed: true, remaining: FREE_LIMIT - used - 1 };
}

export async function checkScanQuota(
  chatId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const sub = await getSub(chatId);
  if (!sub) return { allowed: false, remaining: 0 };
  if (sub.tier !== "free") return { allowed: true, remaining: 999 };

  const today = todayStr();
  const needsReset = sub.lastQuotaDate !== today;
  const used = needsReset ? 0 : (sub.freeScansToday ?? 0);

  if (used >= FREE_LIMIT) return { allowed: false, remaining: 0 };

  await db
    .update(subscribersTable)
    .set({
      freeScansToday: used + 1,
      lastQuotaDate: today,
      updatedAt: new Date(),
    })
    .where(eq(subscribersTable.chatId, chatId));

  return { allowed: true, remaining: FREE_LIMIT - used - 1 };
}
