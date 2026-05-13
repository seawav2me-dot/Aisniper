import { Router, type IRouter } from "express";
import { sendMessage, setWebhook, getBotInfo } from "../lib/telegram";
import { MSG } from "../lib/botMessages";
import { logger } from "../lib/logger";

const router: IRouter = Router();

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
}

router.post("/telegram/webhook", async (req, res) => {
  const update = req.body as TelegramUpdate;

  if (!update.message?.text) {
    res.json({ ok: true });
    return;
  }

  const { text, from, chat } = update.message;
  const chatId = chat.id;
  const name = from.first_name ?? "Trader";
  const cmd = text.split(" ")[0]?.toLowerCase().trim();

  logger.info({ chatId, cmd, from: from.id }, "Telegram command received");

  switch (cmd) {
    case "/start":
      await sendMessage(chatId, MSG.welcome(name));
      break;
    case "/market":
      await sendMessage(chatId, MSG.market("BULLISH", "67,340", 71, 87));
      break;
    case "/signals":
      await sendMessage(chatId, MSG.signals);
      break;
    case "/whale":
      await sendMessage(chatId, MSG.whales);
      break;
    case "/scanner":
      await sendMessage(chatId, MSG.scanner);
      break;
    case "/vip":
      await sendMessage(chatId, MSG.vip());
      break;
    case "/help":
      await sendMessage(chatId, MSG.help);
      break;
    default:
      await sendMessage(chatId, MSG.help);
  }

  res.json({ ok: true });
});

router.post("/telegram/setup-webhook", async (req, res) => {
  const domain = (req.body as { domain?: string }).domain
    ?? process.env["REPLIT_DOMAINS"]?.split(",")[0];

  if (!domain) {
    res.status(400).json({ error: "domain required" });
    return;
  }

  const webhookUrl = `https://${domain}/api/telegram/webhook`;
  const ok = await setWebhook(webhookUrl);
  res.json({ ok, webhookUrl });
});

router.get("/telegram/info", async (_req, res) => {
  const info = await getBotInfo();
  if (!info) {
    res.status(503).json({ error: "Cannot reach Telegram API or token invalid" });
    return;
  }
  res.json({ ok: true, bot: info });
});

export default router;
