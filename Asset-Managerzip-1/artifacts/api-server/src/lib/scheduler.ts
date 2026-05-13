import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { sendMessage } from "./telegram";
import { MSG } from "./botMessages";
import { logger } from "./logger";
import { getLiveMarketData, formatPrice } from "./priceService";

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

  logger.info({ jobs: schedules.length }, "Scheduler started");
}

export function stopScheduler() {
  for (const t of timers) clearInterval(t);
  timers.length = 0;
  logger.info("Scheduler stopped");
}
