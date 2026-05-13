import { execSync } from "child_process";
import { logger } from "./logger";

export function validateEnv(): void {
  const token = process.env["TELEGRAM_BOT_TOKEN"] ?? process.env["BOT_TOKEN"];

  if (!token) {
    logger.error(
      "⛔ المتغير TELEGRAM_BOT_TOKEN غير موجود.\n" +
      "   أضفه في إعدادات المنصة السحابية (Render / Railway / Replit Secrets).\n" +
      "   مثال: TELEGRAM_BOT_TOKEN=123456:ABCdef..."
    );
    process.exit(1);
  }

  if (!process.env["TELEGRAM_BOT_TOKEN"] && process.env["BOT_TOKEN"]) {
    process.env["TELEGRAM_BOT_TOKEN"] = process.env["BOT_TOKEN"];
    logger.warn(
      "⚠️  BOT_TOKEN تم قبوله كـ TELEGRAM_BOT_TOKEN تلقائياً.\n" +
      "   يُفضل إعادة تسميته TELEGRAM_BOT_TOKEN في إعداداتك."
    );
  }

  if (!process.env["DATABASE_URL"]) {
    logger.warn(
      "⚠️  DATABASE_URL غير موجود — ميزات قاعدة البيانات ستفشل.\n" +
      "   مثال: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
    );
  }

  if (!process.env["ADMIN_CHAT_ID"]) {
    logger.warn(
      "⚠️  ADMIN_CHAT_ID غير موجود — أوامر /approve و /stats و /stats معطلة.\n" +
      "   أرسل /start للبوت وانظر chat_id في الـ logs لتحديده."
    );
  }

  if (!process.env["API_KEY"]) {
    logger.warn(
      "⚠️  API_KEY غير موجود — جميع endpoints مفتوحة بدون مصادقة.\n" +
      "   يُنصح بإضافة API_KEY في إعدادات Render لحماية الـ API.\n" +
      "   مثال: API_KEY=sniper_sk_xxxxxxxxxxxxxxxxxxxxxxxx"
    );
  } else {
    logger.info("API_KEY: مفعّل — الـ endpoints محمية");
  }
}

export async function runAutoMigrate(): Promise<void> {
  if (process.env["AUTO_MIGRATE"] !== "true") return;
  logger.info("AUTO_MIGRATE=true — تشغيل drizzle-kit push ...");
  try {
    execSync("pnpm --filter @workspace/db run push-force", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    logger.info("Auto-migrate: اكتمل — الجداول جاهزة.");
  } catch (e) {
    logger.error(
      { e },
      "Auto-migrate: فشل — تحقق من DATABASE_URL وصحة الاتصال بقاعدة البيانات."
    );
  }
}

export async function registerBotCommands(): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"] ?? process.env["BOT_TOKEN"];
  if (!token) return;

  const commands = [
    { command: "start",           description: "بدء / رسالة الترحيب" },
    { command: "market",          description: "حالة السوق الآن" },
    { command: "signals",         description: "إشارات التداول النشطة" },
    { command: "whale",           description: "تحركات الحيتان" },
    { command: "scanner",         description: "السكانر الذكي" },
    { command: "vip",             description: "الترقية إلى VIP" },
    { command: "pay",             description: "إرسال إثبات الدفع" },
    { command: "ref",             description: "الإحالات ومكافآتك" },
    { command: "subscribe",       description: "تفعيل الإشعارات التلقائية" },
    { command: "menu",            description: "القائمة الرئيسية" },
    { command: "help",            description: "جميع الأوامر" },
    { command: "approve",         description: "🔐 أدمن — قبول دفع: /approve <id> [vip|elite]" },
    { command: "reject",          description: "🔐 أدمن — رفض دفع: /reject <id>" },
    { command: "stats",           description: "🔐 أدمن — إحصائيات المشتركين" },
    { command: "setprice",        description: "🔐 أدمن — تعديل السعر: /setprice <key> <amount>" },
    { command: "prices",          description: "🔐 أدمن — عرض الأسعار الحالية" },
    { command: "blast",           description: "🔐 أدمن — إرسال رسالة لكل المشتركين" },
    { command: "weekly_report",   description: "🔐 أدمن — التقرير الأسبوعي" },
    { command: "monthly_report",  description: "🔐 أدمن — التقرير الشهري" },
    { command: "ref_stats",       description: "🔐 أدمن — إحصائيات الإحالات" },
  ];

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (data.ok) {
      logger.info({ count: commands.length }, "Bot commands registered — menu button active");
    } else {
      logger.error({ desc: data.description }, "Failed to register bot commands");
    }
  } catch (e) {
    logger.error({ e }, "registerBotCommands: network error");
  }
}
