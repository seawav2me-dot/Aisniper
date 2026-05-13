import { sendMessage } from "./telegram";
import { logger } from "./logger";
import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { ApiSignal } from "./signalHistoryService";

const adminChatId = (): number | null => {
  const raw = process.env["ADMIN_CHAT_ID"];
  return raw ? Number(raw) : null;
};

function buildHighConfidenceAlert(signal: ApiSignal): string {
  const dirIcon = signal.direction === "LONG" ? "🟢" : "🔴";
  const dirLabel = signal.direction === "LONG" ? "LONG — شراء" : "SHORT — بيع";
  const tierLabel =
    signal.tier === "EXTREME_SNIPER"
      ? "⚡ EXTREME SNIPER"
      : signal.tier === "HIGH_MOMENTUM"
      ? "🔥 HIGH MOMENTUM"
      : signal.tier;

  return `┌─────────────────────────────┐
│  🎯 <b>إشارة عالية الثقة</b>          │
│  AI Score: <b>${signal.confidence}%</b> — مؤهلة للتداول الوهمي │
└─────────────────────────────┘

${dirIcon} <b>${dirLabel} — ${signal.pair}</b>
${tierLabel}  |  ${signal.timeframe}
AI Confidence: <b>${signal.confidence}%</b>  |  R:R: <b>1:${signal.rr}</b>

<b>الدخول:</b>  ${signal.entry.low} – ${signal.entry.high}
<b>TP1:</b> ${signal.tp[0]}  <b>TP2:</b> ${signal.tp[1]}  <b>TP3:</b> ${signal.tp[2]}
<b>SL:</b>  ${signal.sl}

<b>عوامل التحليل:</b>
${signal.factors.map((f) => `• ${f}`).join("\n")}${signal.whaleActivity ? "\n🐋 نشاط حيتان مؤكد" : ""}

<i>تم تسجيلها تلقائياً في التداول الوهمي ✅</i>`;
}

function buildTpSlAlert(
  signal: ApiSignal,
  event: "TP1" | "TP2" | "TP3" | "SL",
  profitPct?: number,
): string {
  const isWin = event !== "SL";
  const icon = isWin ? "✅" : "❌";
  const label =
    event === "TP1"
      ? "الهدف الأول تحقق"
      : event === "TP2"
      ? "الهدف الثاني تحقق"
      : event === "TP3"
      ? "الهدف الثالث تحقق — إغلاق كامل"
      : "وقف الخسارة تُفعِّل";

  const pnlLine =
    profitPct !== undefined
      ? `\n<b>نتيجة التداول الوهمي:</b> ${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(2)}% على $100`
      : "";

  return `${icon} <b>${label} — ${signal.pair}</b>

الاتجاه: ${signal.direction === "LONG" ? "🟢 LONG" : "🔴 SHORT"}
AI Score: <b>${signal.confidence}%</b>  |  ${signal.timeframe}${pnlLine}${
    isWin && event !== "TP3"
      ? "\n\n<i>انقل وقف الخسارة لنقطة التعادل وانتظر الهدف التالي.</i>"
      : ""
  }`;
}

export async function notifyHighConfidenceSignal(signal: ApiSignal): Promise<void> {
  if (signal.confidence < 85) return;

  const message = buildHighConfidenceAlert(signal);
  const admin = adminChatId();

  let vipSubscribers: { chatId: number; tier: string }[] = [];
  try {
    const rows = await db
      .select({ chatId: subscribersTable.chatId, tier: subscribersTable.tier })
      .from(subscribersTable)
      .where(eq(subscribersTable.isActive, true));
    vipSubscribers = rows.filter((r) => r.tier !== "free");
  } catch (e) {
    logger.error({ e }, "alertService: failed to fetch VIP subscribers");
  }

  if (admin) {
    try {
      await sendMessage(admin, `👑 <b>تنبيه أدمن — إشارة ${signal.confidence}%</b>\n\n` + message);
    } catch (e) {
      logger.error({ e }, "alertService: failed to send admin alert");
    }
  }

  let sent = 0;
  for (const sub of vipSubscribers) {
    try {
      await sendMessage(sub.chatId, message);
      sent++;
      await new Promise((r) => setTimeout(r, 60));
    } catch (e) {
      logger.warn({ e, chatId: sub.chatId }, "alertService: failed to send VIP alert");
    }
  }

  logger.info({ pair: signal.pair, confidence: signal.confidence, sent }, "High-confidence alert sent");
}

export async function notifyTpSlHit(
  signal: ApiSignal,
  event: "TP1" | "TP2" | "TP3" | "SL",
  profitPct?: number,
): Promise<void> {
  const message = buildTpSlAlert(signal, event, profitPct);
  const admin = adminChatId();

  let vipSubscribers: { chatId: number }[] = [];
  try {
    const rows = await db
      .select({ chatId: subscribersTable.chatId, tier: subscribersTable.tier })
      .from(subscribersTable)
      .where(eq(subscribersTable.isActive, true));
    vipSubscribers = rows.filter((r) => r.tier !== "free");
  } catch (e) {
    logger.error({ e }, "alertService: failed to fetch subscribers for TP/SL notify");
  }

  if (admin) {
    try {
      await sendMessage(admin, message);
    } catch (e) {
      logger.error({ e }, "alertService: admin TP/SL notify failed");
    }
  }

  for (const sub of vipSubscribers) {
    try {
      await sendMessage(sub.chatId, message);
      await new Promise((r) => setTimeout(r, 60));
    } catch {}
  }

  logger.info({ pair: signal.pair, event }, "TP/SL alert broadcast done");
}
