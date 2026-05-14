import { formatPrice } from "./priceService";
import { logger } from "./logger";

export interface GeneratedSignal {
  symbol: string;
  direction: "LONG" | "SHORT";
  confidence: number;
  tier: "LOW_RISK" | "MEDIUM" | "HIGH_MOMENTUM" | "EXTREME_SNIPER";
  entry: number;
  entryLow: number;
  entryHigh: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  rr: number;
  timeframe: string;
  factors: string[];
  whaleActivity: boolean;
  generatedAt: number;
}

const FACTORS_LONG = [
  "كسر مستوى مقاومة رئيسي",
  "حجم تداول متصاعد بقوة",
  "تقاطع EMA 20/50 صعودي",
  "RSI خروج من منطقة تشبع البيع",
  "نشاط حيتان شراء ضخم",
  "تشكيل نموذج Cup & Handle",
  "دعم قوي على مستوى Fibonacci 0.618",
  "MACD تقاطع إيجابي",
  "Bollinger Bands ضغط وكسر صعودي",
  "تباعد إيجابي بين السعر والـ RSI",
];

const FACTORS_SHORT = [
  "فشل اختبار مستوى مقاومة قوي",
  "حجم بيع متصاعد بشكل حاد",
  "تقاطع EMA 20/50 هبوطي",
  "RSI في منطقة تشبع الشراء",
  "نشاط حيتان بيع ضخم",
  "تشكيل نموذج Head & Shoulders",
  "رفض قوي عند مستوى Fibonacci 0.786",
  "MACD تقاطع سلبي",
  "Bollinger Bands كسر سفلي",
  "تباعد سلبي بين السعر والـ RSI",
];

function pickFactors(direction: "LONG" | "SHORT", count: number): string[] {
  const pool = direction === "LONG" ? FACTORS_LONG : FACTORS_SHORT;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function deriveTier(confidence: number): GeneratedSignal["tier"] {
  if (confidence >= 90) return "EXTREME_SNIPER";
  if (confidence >= 82) return "HIGH_MOMENTUM";
  if (confidence >= 72) return "MEDIUM";
  return "LOW_RISK";
}

function roundToSignificant(price: number, pct: number): number {
  const raw = price * (1 + pct / 100);
  if (price >= 10_000) return Math.round(raw);
  if (price >= 100) return Math.round(raw * 100) / 100;
  if (price >= 1) return Math.round(raw * 1000) / 1000;
  if (price >= 0.01) return Math.round(raw * 10000) / 10000;
  return Math.round(raw * 1_000_000) / 1_000_000;
}

export function generateSignal(symbol: string, price: number): GeneratedSignal {
  const seed = Date.now() % 10000;
  const direction: "LONG" | "SHORT" = seed % 3 === 0 ? "SHORT" : "LONG";

  const confidence = 68 + Math.floor(Math.random() * 28);
  const tier = deriveTier(confidence);
  const factorCount = tier === "EXTREME_SNIPER" ? 5 : tier === "HIGH_MOMENTUM" ? 4 : 3;
  const factors = pickFactors(direction, factorCount);
  const whaleActivity = confidence >= 85 && Math.random() > 0.4;

  const spreadPct = 0.2 + Math.random() * 0.4;
  const entryLow = roundToSignificant(price, -spreadPct / 2);
  const entryHigh = roundToSignificant(price, spreadPct / 2);
  const entry = roundToSignificant(price, 0);

  let tp1: number, tp2: number, tp3: number, sl: number, rr: number;

  if (direction === "LONG") {
    const slPct = -(1.5 + Math.random() * 2);
    const tp1Pct = 2 + Math.random() * 2;
    const tp2Pct = tp1Pct + 2 + Math.random() * 2;
    const tp3Pct = tp2Pct + 3 + Math.random() * 3;

    sl  = roundToSignificant(price, slPct);
    tp1 = roundToSignificant(price, tp1Pct);
    tp2 = roundToSignificant(price, tp2Pct);
    tp3 = roundToSignificant(price, tp3Pct);
    rr  = Math.round((tp2Pct / Math.abs(slPct)) * 10) / 10;
  } else {
    const slPct = 1.5 + Math.random() * 2;
    const tp1Pct = -(2 + Math.random() * 2);
    const tp2Pct = tp1Pct - (2 + Math.random() * 2);
    const tp3Pct = tp2Pct - (3 + Math.random() * 3);

    sl  = roundToSignificant(price, slPct);
    tp1 = roundToSignificant(price, tp1Pct);
    tp2 = roundToSignificant(price, tp2Pct);
    tp3 = roundToSignificant(price, tp3Pct);
    rr  = Math.round((Math.abs(tp2Pct) / slPct) * 10) / 10;
  }

  const timeframes = ["15M", "1H", "4H"];
  const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)]!;

  logger.info(
    { symbol, direction, confidence, tier, entry, tp1, tp2, tp3, sl, rr },
    "signalGenerator: signal generated"
  );

  return {
    symbol,
    direction,
    confidence,
    tier,
    entry,
    entryLow,
    entryHigh,
    tp1,
    tp2,
    tp3,
    sl,
    rr,
    timeframe,
    factors,
    whaleActivity,
    generatedAt: Date.now(),
  };
}

export function formatSignalMessage(sig: GeneratedSignal): string {
  const dir = sig.direction === "LONG" ? "🟢 LONG  (شراء)" : "🔴 SHORT (بيع)";
  const tierLabel: Record<string, string> = {
    EXTREME_SNIPER: "🎯 EXTREME SNIPER",
    HIGH_MOMENTUM:  "⚡ HIGH MOMENTUM",
    MEDIUM:         "📊 MEDIUM",
    LOW_RISK:       "🛡️ LOW RISK",
  };
  const tierStr = tierLabel[sig.tier] ?? sig.tier;
  const whale = sig.whaleActivity ? "\n🐋 <b>نشاط حيتان مرصود!</b>" : "";
  const factorLines = sig.factors.map((f) => `  • ${f}`).join("\n");

  return `┌─────────────────────────────┐
│  ⚡ <b>AI SIGNAL — ${sig.symbol}</b>
└─────────────────────────────┘

${dir}
🧠 AI Confidence: <b>${sig.confidence}%</b>
🏷️ Tier: <b>${tierStr}</b>
⏱️ Timeframe: <b>${sig.timeframe}</b>${whale}

<b>📍 نقطة الدخول:</b>
  <code>${formatPrice(sig.entryLow)} – ${formatPrice(sig.entryHigh)}</code>

<b>🎯 أهداف الربح:</b>
  TP1 → <code>${formatPrice(sig.tp1)}</code>
  TP2 → <code>${formatPrice(sig.tp2)}</code>
  TP3 → <code>${formatPrice(sig.tp3)}</code>

<b>🛑 وقف الخسارة:</b>
  SL → <code>${formatPrice(sig.sl)}</code>

<b>⚖️ نسبة المخاطرة/العائد:</b>
  R:R = <b>1 : ${sig.rr}</b>

<b>🔍 عوامل التحليل:</b>
${factorLines}

<i>⚠️ هذا تحليل تقني — ليس نصيحة مالية</i>`;
}
