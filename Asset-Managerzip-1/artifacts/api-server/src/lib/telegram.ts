import { logger } from "./logger";

const BASE_URL = () => {
  const token = process.env["TELEGRAM_BOT_TOKEN"] ?? process.env["BOT_TOKEN"];
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return `https://api.telegram.org/bot${token}`;
};

export async function sendMessage(
  chatId: number | string,
  text: string,
  options: Record<string, unknown> = {}
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...options }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.error({ err, chatId }, "Telegram sendMessage failed");
    }
  } catch (e) {
    logger.error({ e }, "Telegram sendMessage error");
  }
}

export async function forwardMessage(
  toChatId: number | string,
  fromChatId: number | string,
  messageId: number
): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL()}/forwardMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: toChatId,
        from_chat_id: fromChatId,
        message_id: messageId,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.error({ err, toChatId, fromChatId }, "Telegram forwardMessage failed");
    }
  } catch (e) {
    logger.error({ e }, "Telegram forwardMessage error");
  }
}

export async function setWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL()}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (data.ok) {
      logger.info({ webhookUrl }, "Telegram webhook set");
    } else {
      logger.error({ desc: data.description }, "Telegram setWebhook failed");
    }
    return data.ok;
  } catch (e) {
    logger.error({ e }, "Telegram setWebhook error");
    return false;
  }
}

export async function getBotInfo(): Promise<{ id: number; username: string; first_name: string } | null> {
  try {
    const res = await fetch(`${BASE_URL()}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { id: number; username: string; first_name: string } };
    return data.ok && data.result ? data.result : null;
  } catch {
    return null;
  }
}
