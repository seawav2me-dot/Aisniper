import { Router, type IRouter } from "express";
import { sendMessage, forwardMessage, setWebhook, getBotInfo } from "../lib/telegram";
import { MSG } from "../lib/botMessages";
import { logger } from "../lib/logger";
import {
  upsertSubscriber,
  deactivateSubscriber,
  getSubscriberCount,
  getSubscriberName,
  getAllActiveSubscriberChatIds,
} from "../lib/subscriberService";
import { createPendingPayment, approvePayment, rejectPayment, getPendingPaymentCount } from "../lib/paymentService";
import {
  parseChatIdFromCode,
  recordReferral,
  getReferralStats,
  getGlobalReferralStats,
} from "../lib/referralService";
import { getLiveMarketData, formatPrice } from "../lib/priceService";
import { getVipPrices, setSetting, isValidSettingKey } from "../lib/settingsService";
import { checkSignalQuota, checkScanQuota } from "../lib/freeQuotaService";
import { getLivePrice } from "../lib/livePriceMonitor";
import { ensurePriceTracked } from "../lib/onDemandPriceTracker";

const router: IRouter = Router();

const adminChatId = () => {
  const raw = process.env["ADMIN_CHAT_ID"];
  return raw ? Number(raw) : null;
};

interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    photo?: TelegramPhoto[];
    caption?: string;
  };
}

async function handleAdminCommand(
  cmd: string,
  args: string[],
  adminId: number,
): Promise<string> {
  if (cmd === "/approve") {
    const targetId = Number(args[0]);
    const tier = (args[1] ?? "vip").toLowerCase();
    if (!targetId || isNaN(targetId)) return "❌ الاستخدام: /approve <chat_id> [vip|elite]";
    if (!["vip", "elite"].includes(tier)) return "❌ الـ tier يجب أن يكون vip أو elite";

    const result = await approvePayment(targetId, tier, adminId);
    if (!result) return `❌ لم يتم العثور على طلب معلق للمستخدم ${targetId}`;

    await sendMessage(targetId, MSG.vipApproved(result.name, result.tier));

    if (result.referrerChatId) {
      const referrerName = await getSubscriberName(result.referrerChatId);
      if (referrerName) {
        await sendMessage(result.referrerChatId, MSG.referralRewarded(referrerName, result.name));
      }
    }

    return `✅ تم ترقية المستخدم ${result.name} (${targetId}) إلى ${tier.toUpperCase()}`;
  }

  if (cmd === "/reject") {
    const targetId = Number(args[0]);
    if (!targetId || isNaN(targetId)) return "❌ الاستخدام: /reject <chat_id>";

    const name = await rejectPayment(targetId, adminId);
    if (!name) return `❌ لم يتم العثور على طلب معلق للمستخدم ${targetId}`;

    await sendMessage(targetId, MSG.vipRejected(name));
    return `🚫 تم رفض طلب المستخدم ${name} (${targetId})`;
  }

  if (cmd === "/stats") {
    const counts = await getSubscriberCount();
    const pending = await getPendingPaymentCount();
    return MSG.adminStats(counts.total, counts.vip, counts.free, pending);
  }

  if (cmd === "/ref_stats") {
    const stats = await getGlobalReferralStats();
    return MSG.adminReferralStats(
      stats.totalReferrals,
      stats.converted,
      stats.pending,
      stats.topReferrers,
    );
  }

  if (cmd === "/setprice") {
    const key = args[0] ?? "";
    const rawAmount = args[1] ?? "";
    if (!key || !rawAmount) {
      return "❌ الاستخدام: /setprice <vip_monthly|vip_annual|elite_monthly|elite_annual> <مبلغ>";
    }
    if (!isValidSettingKey(key)) {
      return "❌ المفتاح غير صحيح. الخيارات:\nvip_monthly  vip_annual  elite_monthly  elite_annual";
    }
    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) return "❌ المبلغ يجب أن يكون رقماً موجباً";
    await setSetting(key, amount.toString());
    return `✅ تم تحديث <b>${key}</b> إلى <b>$${amount}</b>`;
  }

  if (cmd === "/prices") {
    const prices = await getVipPrices();
    return MSG.adminPrices(prices);
  }

  if (cmd === "/blast") {
    if (args.length === 0) return "❌ الاستخدام: /blast <رسالتك هنا>";
    const message = args.join(" ");
    const chatIds = await getAllActiveSubscriberChatIds();
    let sent = 0;
    for (const id of chatIds) {
      try {
        await sendMessage(id, message);
        sent++;
      } catch {}
    }
    return MSG.adminBlastSent(sent);
  }

  if (cmd === "/weekly_report") {
    try {
      const { getPerformanceSummary } = await import("../lib/paperTradingService");
      const summary = await getPerformanceSummary();
      const w = summary.weekly[0];
      const at = summary.allTime;
      if (!w) return "❌ لا توجد بيانات أسبوعية بعد.";
      return `📊 <b>التقرير الأسبوعي</b>\n\nالأسبوع: ${w.weekLabel}\nصفقات: ${w.totalSignals}  |  نجاح: ${w.wins}  |  خسارة: ${w.losses}\nنسبة النجاح: <b>${w.winRate}%</b>\nربح على $100: <b>+$${w.profitOn100}</b>\n\nالكلي: ${at.totalSignals} صفقة  |  ${at.winRate}% نجاح`;
    } catch {
      return "❌ تعذر جلب بيانات الأداء.";
    }
  }

  if (cmd === "/monthly_report") {
    try {
      const { getPerformanceSummary } = await import("../lib/paperTradingService");
      const summary = await getPerformanceSummary();
      const m = summary.monthly[0];
      const at = summary.allTime;
      if (!m) return "❌ لا توجد بيانات شهرية بعد.";
      return `🏆 <b>التقرير الشهري</b>\n\n${m.label}\nصفقات: ${m.totalSignals}  |  نجاح: ${m.wins}  |  خسارة: ${m.losses}\nنسبة النجاح: <b>${m.winRate}%</b>\nربح على $100: <b>+$${m.profitOn100}</b>\n\nالكلي: $${at.totalProfit} ربح  |  أفضل شهر: ${at.bestMonth}`;
    } catch {
      return "❌ تعذر جلب بيانات الأداء.";
    }
  }

  return "";
}

router.post("/telegram/webhook", async (req, res) => {
  const update = req.body as TelegramUpdate;

  if (!update.message) {
    res.json({ ok: true });
    return;
  }

  const { from, chat, text, photo, message_id } = update.message;
  const chatId = chat.id;
  const name = from.first_name ?? "Trader";
  const admin = adminChatId();
  const isAdmin = admin !== null && chatId === admin;

  logger.info({ chatId, isAdmin, hasPhoto: !!photo, text }, "Telegram message received");

  if (photo && photo.length > 0) {
    const bestPhoto = photo[photo.length - 1]!;
    const fileId = bestPhoto.file_id;

    const paymentId = await createPendingPayment(chatId, name, from.username, fileId);

    await sendMessage(chatId, MSG.payReceived(name));

    if (admin && paymentId !== null) {
      await sendMessage(
        admin,
        MSG.adminPaymentAlert(name, from.username ?? null, chatId, paymentId),
      );
      await forwardMessage(admin, chatId, message_id);
    }

    res.json({ ok: true });
    return;
  }

  if (!text) {
    res.json({ ok: true });
    return;
  }

  const parts = text.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  if (isAdmin) {
    const adminCmds = ["/approve", "/reject", "/stats", "/ref_stats", "/setprice", "/prices", "/blast", "/weekly_report", "/monthly_report"];
    if (adminCmds.includes(cmd)) {
      const reply = await handleAdminCommand(cmd, args, chatId);
      if (reply) await sendMessage(chatId, reply);
      res.json({ ok: true });
      return;
    }
  }

  switch (cmd) {
    case "/start": {
      await upsertSubscriber(chatId, name, from.username);

      const refCode = args[0];
      if (refCode) {
        const referrerChatId = parseChatIdFromCode(refCode);
        if (referrerChatId && referrerChatId !== chatId) {
          const recorded = await recordReferral(referrerChatId, chatId);
          if (recorded) {
            const referrerName = await getSubscriberName(referrerChatId);
            await sendMessage(chatId, MSG.referralWelcome(name, referrerName ?? "صديق"));
            break;
          }
        }
      }

      await sendMessage(chatId, MSG.welcome(name));
      break;
    }

    case "/market": {
      const live = await getLiveMarketData();
      const marketMsg = live
        ? MSG.market(live.marketStatus, formatPrice(live.btc), live.fearGreed, live.winRate)
        : MSG.market("BULLISH", "67,340", 71, 87);
      await sendMessage(chatId, marketMsg);
      break;
    }

    case "/signals": {
      const quota = await checkSignalQuota(chatId);
      if (quota.remaining === 999) {
        await sendMessage(chatId, MSG.signals);
      } else if (!quota.allowed) {
        const prices = await getVipPrices();
        await sendMessage(chatId, MSG.signalsPaywall(prices.vipMonthly));
      } else {
        const prices = await getVipPrices();
        await sendMessage(chatId, MSG.signalsFree(quota.remaining, prices.vipMonthly));
      }
      break;
    }

    case "/whale":
      await sendMessage(chatId, MSG.whales);
      break;

    case "/scanner": {
      const quota = await checkScanQuota(chatId);
      if (quota.remaining === 999) {
        await sendMessage(chatId, MSG.scanner);
      } else if (!quota.allowed) {
        const prices = await getVipPrices();
        await sendMessage(chatId, MSG.scannerPaywall(prices.vipMonthly));
      } else {
        const prices = await getVipPrices();
        await sendMessage(chatId, MSG.scannerFree(quota.remaining, prices.vipMonthly));
      }
      break;
    }

    case "/vip": {
      const prices = await getVipPrices();
      await sendMessage(chatId, MSG.vip(prices));
      break;
    }

    case "/pay": {
      const prices = await getVipPrices();
      await sendMessage(chatId, MSG.payInstructions(prices));
      break;
    }

    case "/ref": {
      const stats = await getReferralStats(chatId);
      await sendMessage(chatId, MSG.referralStats(
        name,
        stats.code,
        stats.link,
        stats.total,
        stats.converted,
        stats.pending,
      ));
      break;
    }

    case "/subscribe":
      await upsertSubscriber(chatId, name, from.username);
      await sendMessage(chatId, MSG.subscribeConfirm(name));
      break;

    case "/unsubscribe":
      await deactivateSubscriber(chatId);
      await sendMessage(chatId, MSG.unsubscribeConfirm(name));
      break;

    case "/menu":
      await sendMessage(chatId, MSG.menu);
      break;

    case "/help":
      await sendMessage(chatId, MSG.help);
      break;

    case "/price": {
      const rawSym = args[0];
      if (!rawSym) {
        await sendMessage(chatId,
          "❌ يرجى تحديد رمز العملة\nمثال: <code>/price BTC</code> أو <code>/price PEPEUSDT</code>"
        );
        break;
      }

      const sym = rawSym.toUpperCase().endsWith("USDT")
        ? rawSym.toUpperCase()
        : `${rawSym.toUpperCase()}USDT`;

      await sendMessage(chatId, `🔍 جارٍ جلب سعر <b>${sym}</b>...`);

      let price = getLivePrice(sym);

      if (!price) {
        price = await ensurePriceTracked(sym);
      }

      if (!price) {
        await sendMessage(chatId,
          `❌ لم يتم العثور على <b>${sym}</b> على Binance.\n\nتأكد من رمز العملة وأنه مدرج كزوج USDT.`
        );
        break;
      }

      const isTrackedLive = getLivePrice(sym) !== null;
      const trackNote = isTrackedLive
        ? "🟢 سعر لحظي (WebSocket)"
        : "🟡 سعر مباشر — تم تفعيل التتبع لمدة ساعتين";

      await sendMessage(chatId,
        `💰 <b>${sym}</b>\n\n` +
        `السعر: <b>$${formatPrice(price)}</b>\n` +
        `${trackNote}`
      );
      break;
    }

    default:
      await sendMessage(chatId, MSG.menu);
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
