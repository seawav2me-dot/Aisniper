import { logger } from "./logger";

interface TelegramUpdate { update_id: number; [key: string]: unknown }

let running = false;

async function getUpdates(offset: number, timeout = 25): Promise<TelegramUpdate[]> {
  const token = process.env["TELEGRAM_BOT_TOKEN"] ?? process.env["BOT_TOKEN"];
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=${timeout}&limit=100`,
      { signal: AbortSignal.timeout((timeout + 5) * 1000) },
    );
    const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
    return data.ok ? (data.result ?? []) : [];
  } catch {
    return [];
  }
}

async function deleteWebhook() {
  const token = process.env["TELEGRAM_BOT_TOKEN"] ?? process.env["BOT_TOKEN"];
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: "POST" });
    logger.info("Poller: webhook deleted — long polling active");
  } catch {}
}

export async function startPolling(port: number) {
  await deleteWebhook();
  running = true;
  let offset = 0;

  logger.info({ port }, "Poller: starting long polling loop");

  while (running) {
    const updates = await getUpdates(offset);
    for (const update of updates) {
      offset = update.update_id + 1;
      try {
        await fetch(`http://localhost:${port}/api/telegram/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (e) {
        logger.error({ e, update_id: update.update_id }, "Poller: failed to relay update");
      }
    }
    if (updates.length === 0) {
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
}

export function stopPolling() {
  running = false;
  logger.info("Poller: stopped");
}
