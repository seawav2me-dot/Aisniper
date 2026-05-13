const wallet = () => process.env["WALLET_ADDRESS"] ?? "N/A";

export const MSG = {
  welcome: (name: string) =>
    `┌─────────────────────────────┐
│  🔥 <b>AI SNIPER PRO MAX</b>        │
│  Institutional Trading Engine │
└─────────────────────────────┘

مرحباً <b>${name}</b> 👋

أنت داخل أقوى منصة تداول ذكي على تيليغرام.

<b>الأوامر المتاحة:</b>
/signals — أحدث الإشارات النشطة
/market  — حالة السوق الآن
/whale   — تحركات الحيتان
/scanner — الفرص الذكية
/vip     — الترقية للـ VIP
/help    — جميع الأوامر`,

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
TP1: 2490  TP2: 2525  TP3: 2580
SL: 2428  |  R:R: 1:4.2
✅ TP1 HIT — Move SL to break even

────────────────────────
🟢 <b>LONG — SOLUSDT</b>
AI Confidence: <b>87%</b>  |  Tier: HIGH MOMENTUM
Entry: 142.5 – 144.0
TP1: 148  TP2: 153.5  TP3: 162
SL: 138.8  |  R:R: 1:3.8

<i>للإشارات الفورية غير المحدودة → /vip</i>`,

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

  vip: () =>
    `┌─────────────────────────────┐
│  👑 <b>VIP MEMBERSHIP</b>            │
└─────────────────────────────┘

<b>VIP — $29/month</b>
✅ إشارات فورية غير محدودة
✅ إشارات Extreme Sniper حصرية
✅ Whale Tracker كامل
✅ AI Scanner
✅ دخول مبكر للصفقات

<b>ELITE — $79/month</b>
✅ كل مزايا VIP
✅ Auto Trading (قريباً)
✅ Copy Trading (قريباً)
✅ مجموعة إشارات خاصة

────────────────────────
<b>طريقة الدفع (Crypto):</b>
USDT TRC20 / BEP20

<b>عنوان المحفظة:</b>
<code>${wallet()}</code>

بعد الدفع أرسل صورة التحويل للدعم.`,

  help: `┌─────────────────────────────┐
│  ❓ <b>COMMANDS</b>                   │
└─────────────────────────────┘

/start   — الصفحة الرئيسية
/signals — الإشارات النشطة
/market  — حالة السوق
/whale   — تحركات الحيتان
/scanner — AI Scanner
/vip     — الاشتراك والأسعار
/help    — هذه القائمة`,
};
