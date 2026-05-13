import type { VipPrices } from "./settingsService";

const wallet = () => process.env["WALLET_ADDRESS"] ?? "N/A";
const appLink = () => process.env["APP_LINK"] ?? "";

export const MSG = {
  welcome: (name: string) => {
    const link = appLink();
    return `┌─────────────────────────────┐
│  🔥 <b>AI SNIPER PRO MAX</b>        │
│  Institutional Trading Engine │
└─────────────────────────────┘

مرحباً <b>${name}</b> 👋

أنت داخل أقوى منصة تداول ذكي على تيليغرام.

<b>الأوامر المتاحة:</b>
/signals   — أحدث الإشارات النشطة
/market    — حالة السوق الآن
/whale     — تحركات الحيتان
/scanner   — الفرص الذكية
/vip       — الترقية للـ VIP
/pay       — إرسال إثبات الدفع
/ref       — رابط الإحالة ومكافآتك
/subscribe — تفعيل الإشعارات التلقائية
/help      — جميع الأوامر${link ? `\n\n📱 <b>حمّل التطبيق:</b> ${link}` : ""}`;
  },

  market: (status: string, btcPrice: string, fearGreed: number, winRate: number) =>
    `┌─────────────────────────────┐
│  📊 <b>MARKET STATUS</b>              │
└─────────────────────────────┘

Status:  <b>${status === "BULLISH" ? "🟢 BULLISH" : "🔴 BEARISH"}</b>
BTC:     <b>$${btcPrice}</b>
Fear & Greed: <b>${fearGreed}/100</b>
AI Mode: <b>ACTIVE</b>
Win Rate: <b>${winRate}%</b>

<i>AI Scanner يعمل على مدار الساعة...</i>`,

  signals: `┌─────────────────────────────┐
│  ⚡ <b>ACTIVE SIGNALS</b>             │
└─────────────────────────────┘

🟢 <b>LONG — ETHUSDT</b>
AI Confidence: <b>94%</b>  |  Tier: EXTREME SNIPER
Entry: 2450 – 2465
TP1: 2510  TP2: 2580  TP3: 2680
SL: 2418  |  R:R: 1:3.8
✅ TP1 HIT — Move SL to break even

────────────────────────
🟢 <b>LONG — SOLUSDT</b>
AI Confidence: <b>87%</b>  |  Tier: HIGH MOMENTUM
Entry: 142.5 – 144.0
TP1: 148  TP2: 153.5  TP3: 162
SL: 138.8  |  R:R: 1:3.8

────────────────────────
🟢 <b>LONG — BTCUSDT</b>
AI Confidence: <b>94%</b>  |  Tier: EXTREME SNIPER
Entry: 80200 – 80500
TP1: 81400  TP2: 82800  TP3: 84500
SL: 79100  |  R:R: 1:3.5

────────────────────────
🔴 <b>SHORT — LINKUSDT</b>
AI Confidence: <b>84%</b>  |  Tier: HIGH MOMENTUM
Entry: 14.8 – 15.1
TP1: 14.2  TP2: 13.6  TP3: 12.9
SL: 15.6  |  R:R: 1:3.1

<i>للإشارات الفورية غير المحدودة → /vip</i>`,

  signalsFree: (remaining: number, vipMonthly: number) =>
    `┌─────────────────────────────┐
│  ⚡ <b>ACTIVE SIGNALS</b>             │
└─────────────────────────────┘

🟢 <b>LONG — ETHUSDT</b>
AI Confidence: <b>91%</b>  |  Tier: HIGH MOMENTUM
Entry: 2450 – 2465
TP1: 2510  TP2: 2580  TP3: 2680
SL: 2418  |  R:R: 1:3.8

────────────────────────
🟢 <b>LONG — SOLUSDT</b>
AI Confidence: <b>87%</b>  |  Tier: HIGH MOMENTUM
Entry: 142.5 – 144.0
TP1: 148  TP2: 153.5  TP3: 162
SL: 138.8  |  R:R: 1:3.8

────────────────────────
🔒 <b>إشارة VIP مقفلة</b> — Tier: EXTREME SNIPER
AI Score: 94  |  Entry: [VIP فقط]
TP1 / TP2 / TP3: [مقفل]

────────────────────────
${remaining > 0 ? `⚡ لديك <b>${remaining}</b> إشارة مجانية متبقية اليوم` : "📊 انتهت إشاراتك اليومية المجانية (2/2)"}

👑 إشارات غير محدودة + EXTREME SNIPER → /vip
💲 <b>$${vipMonthly}/شهر</b> فقط`,

  signalsPaywall: (vipMonthly: number) =>
    `┌─────────────────────────────┐
│  ⚡ <b>ACTIVE SIGNALS</b>             │
└─────────────────────────────┘

📊 <b>انتهت إشاراتك اليومية المجانية (2/2)</b>

🔒 لديك <b>4 إشارات VIP نشطة</b> الآن غير متاحة لك
من ضمنها إشارات <b>EXTREME SNIPER</b> بدقة <b>94%+</b>

────────────────────────
👑 اشترك في VIP — <b>$${vipMonthly}/شهر</b>
✅ إشارات فورية غير محدودة
✅ Extreme Sniper حصرية
✅ Whale Tracker كامل
✅ AI Scanner 142 عملة

/vip — عرض الخطط والأسعار
/pay — إرسال إثبات الدفع`,

  whales: `┌─────────────────────────────┐
│  🐋 <b>WHALE TRACKER</b>             │
└─────────────────────────────┘

🔴 <b>EXTREME</b> — Exchange Inflow
BTCUSDT  →  <b>$214M</b>  (Bybit)
منذ 22 دقيقة

🟠 <b>CRITICAL</b> — Whale Accumulation
SOLUSDT  →  <b>$97M</b>  (Coinbase)
منذ 15 دقيقة

🟠 <b>CRITICAL</b> — Large Buy
BTCUSDT  →  <b>$83.5M</b>  (Binance)
منذ 3 دقائق

<b>تنبيه:</b> نشاط حيتان مرتفع — السوق قد يتحرك!`,

  scanner: `┌─────────────────────────────┐
│  🧠 <b>AI SCANNER RESULTS</b>        │
└─────────────────────────────┘

<b>Bullish Setups:</b>
1. BTC  — AI Score: 91  📈 4H
2. ETH  — AI Score: 88  📈 1H
3. SOL  — AI Score: 85  📈 15M
4. ARB  — AI Score: 83  📈 1H
5. AVAX — AI Score: 79  📈 4H

<b>Bearish Setups:</b>
1. LINK — AI Score: 71  📉 15M
2. BNB  — AI Score: 62  📉 1H

<i>7 طبقات تحليل | 3 إطارات زمنية | 142 عملة</i>`,

  scannerFree: (remaining: number, vipMonthly: number) =>
    `┌─────────────────────────────┐
│  🧠 <b>AI SCANNER</b>                │
└─────────────────────────────┘

<b>Bullish Setups:</b>
1. BTC  — AI Score: 91  📈 4H
2. ETH  — AI Score: 88  📈 1H
3. SOL  — AI Score: 85  📈 15M

🔒 <b>+4 نتائج VIP مقفلة</b>
   (ARB • AVAX • LINK • ADA)

────────────────────────
${remaining > 0 ? `⚡ لديك <b>${remaining}</b> فحص مجاني متبقي اليوم` : "📊 انتهت فحوصاتك اليومية المجانية (2/2)"}

👑 فحص كامل لـ 142 عملة → /vip
💲 <b>$${vipMonthly}/شهر</b> فقط`,

  scannerPaywall: (vipMonthly: number) =>
    `┌─────────────────────────────┐
│  🧠 <b>AI SCANNER</b>                │
└─────────────────────────────┘

📊 <b>انتهت فحوصاتك اليومية المجانية (2/2)</b>

🔒 <b>7 نتائج AI Scanner</b> متاحة الآن لأعضاء VIP
بما فيها صفقات ARB و AVAX بدرجات 79-83

────────────────────────
👑 اشترك في VIP — <b>$${vipMonthly}/شهر</b>
✅ AI Scanner كامل — 142 عملة
✅ 7 طبقات تحليل | 3 إطارات زمنية
✅ إشارات فورية غير محدودة

/vip — عرض الخطط
/pay — إرسال إثبات الدفع`,

  vip: (prices: VipPrices) =>
    `┌─────────────────────────────┐
│  👑 <b>VIP MEMBERSHIP</b>            │
└─────────────────────────────┘

<b>VIP — $${prices.vipMonthly}/شهر</b> ($${prices.vipAnnual}/سنة)
✅ إشارات فورية غير محدودة
✅ إشارات Extreme Sniper حصرية
✅ Whale Tracker كامل
✅ AI Scanner — 142 عملة
✅ دخول مبكر للصفقات

<b>ELITE — $${prices.eliteMonthly}/شهر</b> ($${prices.eliteAnnual}/سنة)
✅ كل مزايا VIP
✅ Auto Trading (قريباً)
✅ Copy Trading (قريباً)
✅ مجموعة إشارات خاصة

────────────────────────
<b>طريقة الدفع (Crypto):</b>
USDT TRC20 / BEP20

<b>عنوان المحفظة:</b>
<code>${wallet()}</code>

بعد الدفع أرسل /pay ثم صورة الإيصال.`,

  payInstructions: (prices: VipPrices) =>
    `┌─────────────────────────────┐
│  💳 <b>إرسال إثبات الدفع</b>         │
└─────────────────────────────┘

<b>خطوات الترقية للـ VIP:</b>

1️⃣ أرسل المبلغ لعنوان المحفظة:
<code>${wallet()}</code>

2️⃣ بعد إتمام التحويل، أرسل صورة الإيصال هنا مباشرة.

3️⃣ سيتم مراجعة طلبك وتفعيل حسابك خلال دقائق.

<i>VIP: $${prices.vipMonthly}/شهر  |  ELITE: $${prices.eliteMonthly}/شهر</i>`,

  payReceived: (name: string) =>
    `┌─────────────────────────────┐
│  ✅ <b>تم استلام الإيصال</b>         │
└─────────────────────────────┘

شكراً <b>${name}</b>!

تم إرسال إيصالك للمراجعة.
سيتم تفعيل حسابك خلال دقائق بعد التحقق.

<i>للاستفسار تواصل مع الدعم.</i>`,

  vipApproved: (name: string, tier: string) =>
    `┌─────────────────────────────┐
│  🎉 <b>تم تفعيل اشتراكك!</b>        │
└─────────────────────────────┘

مبروك <b>${name}</b> 🎊

تم ترقية حسابك إلى <b>${tier.toUpperCase()}</b> بنجاح!

<b>مزاياك الآن مفعّلة:</b>
✅ إشارات فورية غير محدودة
✅ Whale Tracker كامل
✅ AI Scanner
✅ تنبيهات تلقائية حصرية

استخدم /signals للإشارات النشطة الآن.`,

  vipRejected: (name: string) =>
    `┌─────────────────────────────┐
│  ❌ <b>تعذّر التحقق</b>              │
└─────────────────────────────┘

عزيزي <b>${name}</b>،

تعذّر التحقق من عملية الدفع.

يرجى إعادة إرسال الإيصال أو التواصل مع الدعم.
/pay — إعادة الإرسال`,

  adminPaymentAlert: (name: string, username: string | null, chatId: number, paymentId: number) =>
    `┌─────────────────────────────┐
│  💰 <b>طلب ترقية VIP جديد</b>       │
└─────────────────────────────┘

<b>المستخدم:</b> ${name}${username ? ` (@${username})` : ""}
<b>Chat ID:</b> <code>${chatId}</code>
<b>Payment ID:</b> <code>${paymentId}</code>

<b>أوامر المراجعة:</b>
/approve ${chatId} vip — ترقية VIP
/approve ${chatId} elite — ترقية ELITE
/reject ${chatId} — رفض الطلب`,

  adminStats: (total: number, vip: number, free: number, pending: number) =>
    `┌─────────────────────────────┐
│  📊 <b>ADMIN STATS</b>               │
└─────────────────────────────┘

<b>المشتركون:</b>
👥 الإجمالي: <b>${total}</b>
👑 VIP/ELITE: <b>${vip}</b>
🆓 مجاني: <b>${free}</b>

<b>طلبات معلقة:</b> <b>${pending}</b>

${pending > 0 ? "⚠️ لديك طلبات تحتاج مراجعة!" : "✅ لا توجد طلبات معلقة"}`,

  adminPrices: (prices: VipPrices) =>
    `┌─────────────────────────────┐
│  💰 <b>أسعار الاشتراك الحالية</b>    │
└─────────────────────────────┘

VIP شهري:   <b>$${prices.vipMonthly}</b>
VIP سنوي:   <b>$${prices.vipAnnual}</b>
Elite شهري: <b>$${prices.eliteMonthly}</b>
Elite سنوي: <b>$${prices.eliteAnnual}</b>

<b>لتغيير سعر:</b>
/setprice vip_monthly &lt;مبلغ&gt;
/setprice vip_annual &lt;مبلغ&gt;
/setprice elite_monthly &lt;مبلغ&gt;
/setprice elite_annual &lt;مبلغ&gt;`,

  adminBlastSent: (count: number) =>
    `✅ تم إرسال الرسالة إلى <b>${count}</b> مشترك بنجاح`,

  subscribeConfirm: (name: string) =>
    `┌─────────────────────────────┐
│  🔔 <b>ALERTS ACTIVATED</b>          │
└─────────────────────────────┘

مرحباً <b>${name}</b> ✅

تم تفعيل الإشعارات التلقائية بنجاح!

<b>ستصلك تلقائياً:</b>
📊 تحديث السوق — كل ساعتين
⚡ الإشارات النشطة — كل 4 ساعات
🐋 تنبيهات الحيتان — كل ساعة (VIP)
🧠 نتائج AI Scanner — كل 6 ساعات (VIP)

لإيقاف الإشعارات: /unsubscribe`,

  unsubscribeConfirm: (name: string) =>
    `┌─────────────────────────────┐
│  🔕 <b>ALERTS PAUSED</b>             │
└─────────────────────────────┘

تم إيقاف الإشعارات التلقائية لحسابك <b>${name}</b>.

لإعادة التفعيل: /subscribe`,

  broadcastHeader: (type: string) => {
    const labels: Record<string, string> = {
      signals: "⚡ إشارة جديدة — AI SNIPER",
      market:  "📊 تحديث السوق المباشر",
      whales:  "🐋 تنبيه الحيتان",
      scanner: "🧠 نتائج AI Scanner",
    };
    return `<b>${labels[type] ?? type}</b>\n\n`;
  },

  referralStats: (
    name: string,
    code: string,
    link: string,
    total: number,
    converted: number,
    pending: number,
  ) =>
    `┌─────────────────────────────┐
│  🔗 <b>برنامج الإحالة</b>             │
└─────────────────────────────┘

مرحباً <b>${name}</b>!

<b>رابط الإحالة الخاص بك:</b>
<code>${link}</code>

<b>كودك:</b> <code>${code}</code>

────────────────────────
<b>إحصائياتك:</b>
👥 إجمالي المُحالين: <b>${total}</b>
✅ تحولوا لـ VIP: <b>${converted}</b>
⏳ في الانتظار: <b>${pending}</b>

────────────────────────
<b>المكافأة:</b>
لكل صديق يشترك في VIP عبر رابطك:
🎁 <b>7 أيام VIP مجانية</b> لك + <b>خصم 10%</b> له

شارك رابطك الآن وابدأ الكسب!`,

  referralWelcome: (name: string, referrerName: string) =>
    `┌─────────────────────────────┐
│  🎉 <b>مرحباً بك!</b>                │
└─────────────────────────────┘

أهلاً <b>${name}</b>!

وصلتنا دعوة من صديقك <b>${referrerName}</b> 🤝

اشترك في VIP واحصل على <b>خصم 10%</b> على أول اشتراك!

/vip — عرض الاشتراكات
/pay — إرسال إثبات الدفع`,

  referralRewarded: (name: string, referredName: string) =>
    `┌─────────────────────────────┐
│  🏆 <b>مكافأة الإحالة!</b>           │
└─────────────────────────────┘

مبروك <b>${name}</b>! 🎊

صديقك <b>${referredName}</b> انضم للـ VIP عبر رابطك!

<b>مكافأتك:</b> 7 أيام VIP مجانية ✅

استمر في المشاركة للمزيد من المكافآت.
/ref — إحصائيات الإحالة`,

  adminReferralStats: (
    totalReferrals: number,
    converted: number,
    pending: number,
    topReferrers: { chatId: number; count: number }[],
  ) => {
    const topList = topReferrers.length > 0
      ? topReferrers
          .map((r, i) => `${i + 1}. ID <code>${r.chatId}</code> — <b>${r.count}</b> إحالات`)
          .join("\n")
      : "لا توجد إحالات بعد";

    return `┌─────────────────────────────┐
│  🔗 <b>إحصائيات الإحالة</b>          │
└─────────────────────────────┘

<b>إجمالي الإحالات:</b> <b>${totalReferrals}</b>
✅ تحولوا لـ VIP: <b>${converted}</b>
⏳ في الانتظار: <b>${pending}</b>

<b>أكثر المُحيلين:</b>
${topList}`;
  },

  menu: `┌─────────────────────────────┐
│  🔥 <b>AI SNIPER PRO MAX</b>        │
│  القائمة الرئيسية             │
└─────────────────────────────┘

اختر أحد الأوامر التالية:

📊 /market      — حالة السوق الآن
🎯 /signals     — الإشارات النشطة
🐋 /whale       — تحركات الحيتان
🔍 /scanner     — السكانر الذكي
👑 /vip         — الترقية إلى VIP
💳 /pay         — إرسال إثبات الدفع
🔗 /ref         — الإحالات ومكافآتك
🔔 /subscribe   — تفعيل الإشعارات
❓ /help        — جميع الأوامر`,

  help: `┌─────────────────────────────┐
│  ❓ <b>COMMANDS</b>                   │
└─────────────────────────────┘

/start       — الصفحة الرئيسية
/menu        — القائمة الرئيسية
/signals     — الإشارات النشطة
/market      — حالة السوق
/whale       — تحركات الحيتان
/scanner     — AI Scanner
/vip         — الاشتراك والأسعار
/pay         — إرسال إثبات الدفع
/ref         — رابط الإحالة ومكافآتك
/subscribe   — تفعيل الإشعارات التلقائية
/unsubscribe — إيقاف الإشعارات
/help        — هذه القائمة`,
};
