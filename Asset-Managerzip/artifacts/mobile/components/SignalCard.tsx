import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/hooks/useT";
import { Signal } from "@/context/AppContext";
import { ScoreRing } from "@/components/charts/ScoreRing";

function formatTimeAgo(ts: number, lang: string) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  if (lang === "en") {
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return "Now";
  }
  if (h > 0) return `منذ ${h}س`;
  if (m > 0) return `منذ ${m}د`;
  return "الآن";
}

function formatPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(3);
  return n.toFixed(4);
}

function getScoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 90) return colors.red;
  if (score >= 80) return colors.orange;
  if (score >= 70) return colors.gold;
  return colors.textMuted;
}

function getStatusColor(status: Signal["status"], colors: ReturnType<typeof useColors>) {
  switch (status) {
    case "ACTIVE": return colors.blue;
    case "TP1_HIT":
    case "TP2_HIT":
    case "TP3_HIT":
    case "CLOSED_WIN": return colors.green;
    case "SL_HIT":
    case "CLOSED_LOSS": return colors.red;
    default: return colors.textMuted;
  }
}

interface SignalCardProps {
  signal: Signal;
  locked?: boolean;
}

export function SignalCard({ signal, locked = false }: SignalCardProps) {
  const colors = useColors();
  const t = useT();
  const lang = t === t ? (t.signalCard.buy === "LONG" ? "en" : "ar") : "ar";
  const isLong = signal.direction === "LONG";
  const directionColor = isLong ? colors.green : colors.red;
  const scoreColor = getScoreColor(signal.score, colors);
  const statusColor = getStatusColor(signal.status, colors);
  const isActive = signal.status === "ACTIVE" || signal.status === "TP1_HIT" || signal.status === "TP2_HIT";

  const qualityLabel =
    signal.score >= 90 ? t.signalCard.quality.elite
    : signal.score >= 80 ? t.signalCard.quality.high
    : signal.score >= 70 ? t.signalCard.quality.good
    : t.signalCard.quality.watch;

  const statusLabel =
    signal.status === "ACTIVE" ? t.signalCard.status.active
    : signal.status === "TP1_HIT" ? t.signalCard.status.tp1
    : signal.status === "TP2_HIT" ? t.signalCard.status.tp2
    : signal.status === "TP3_HIT" ? t.signalCard.status.tp3
    : signal.status === "SL_HIT" ? t.signalCard.status.sl
    : signal.status === "CLOSED_WIN" ? t.signalCard.status.win
    : t.signalCard.status.loss;

  if (locked) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.gold + "33", borderWidth: 1 }]}>
        <View style={[styles.topStripe, { backgroundColor: colors.gold + "44" }]} />
        <View style={styles.lockedContent}>
          <View style={[styles.lockCircle, { backgroundColor: colors.gold + "18" }]}>
            <Feather name="lock" size={22} color={colors.gold} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.gold }]}>{t.signals.vipExclusive}</Text>
          <Text style={[styles.lockedSub, { color: colors.textMuted }]}>{t.signals.vipExclusiveSub}</Text>
          <View style={[styles.lockedPair, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.lockedPairText, { color: colors.textMuted }]}>*** / USDT</Text>
          </View>
        </View>
      </View>
    );
  }

  const isElite = signal.score >= 90;

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.card, borderColor: scoreColor + "44", borderWidth: 1.5 },
      isElite && { borderColor: colors.gold + "66" },
    ]}>
      <View style={[styles.topStripe, { backgroundColor: scoreColor }]} />

      {isElite && (
        <View style={[styles.eliteBanner, { backgroundColor: colors.gold + "12" }]}>
          <MaterialCommunityIcons name="crown" size={12} color={colors.gold} />
          <Text style={[styles.eliteBannerText, { color: colors.gold }]}>ELITE SNIPER</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <ScoreRing score={signal.score} color={scoreColor} size={86} label="/100" />

        <View style={styles.headerRight}>
          <Text style={[styles.pairText, { color: colors.text }]}>{signal.pair.replace("USDT", "")}/USDT</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: directionColor + "22", borderColor: directionColor + "55" }]}>
              <Feather name={isLong ? "trending-up" : "trending-down"} size={11} color={directionColor} />
              <Text style={[styles.badgeText, { color: directionColor }]}>
                {isLong ? t.signalCard.buy : t.signalCard.sell}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: scoreColor + "18", borderColor: scoreColor + "44" }]}>
              <Text style={[styles.badgeText, { color: scoreColor }]}>{qualityLabel}</Text>
            </View>
            <View style={[styles.tfBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.tfText, { color: colors.textMuted }]}>{signal.timeframe}</Text>
            </View>
          </View>
          <View style={styles.statusTimeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            <Text style={[styles.timeText, { color: colors.textMuted }]}>
              {formatTimeAgo(signal.timestamp, t.signalCard.buy === "LONG" ? "en" : "ar")}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.priceGrid}>
        <View style={[styles.priceCell, { borderColor: colors.border, backgroundColor: colors.primary + "08" }]}>
          <Text style={[styles.priceCellLabel, { color: colors.textMuted }]}>{t.signalCard.entry}</Text>
          <Text style={[styles.priceCellValue, { color: colors.text }]}>
            {formatPrice(signal.entry.low)}
          </Text>
          <Text style={[styles.priceCellSub, { color: colors.textMuted }]}>
            — {formatPrice(signal.entry.high)}
          </Text>
        </View>
        <View style={[styles.priceCell, { borderColor: colors.border }]}>
          <Text style={[styles.priceCellLabel, { color: colors.textMuted }]}>{t.signalCard.target1}</Text>
          <Text style={[styles.priceCellValue, { color: signal.tpHit[0] ? colors.green : colors.text }]}>
            {formatPrice(signal.tp[0])}
          </Text>
          {signal.tpHit[0] && <Feather name="check-circle" size={12} color={colors.green} />}
        </View>
        <View style={[styles.priceCell, { borderColor: colors.border }]}>
          <Text style={[styles.priceCellLabel, { color: colors.textMuted }]}>{t.signalCard.target2}</Text>
          <Text style={[styles.priceCellValue, { color: signal.tpHit[1] ? colors.green : colors.text }]}>
            {formatPrice(signal.tp[1])}
          </Text>
          {signal.tpHit[1] && <Feather name="check-circle" size={12} color={colors.green} />}
        </View>
        <View style={[styles.priceCell, { borderColor: colors.border }]}>
          <Text style={[styles.priceCellLabel, { color: colors.textMuted }]}>{t.signalCard.target3}</Text>
          <Text style={[styles.priceCellValue, { color: signal.tpHit[2] ? colors.green : colors.text }]}>
            {formatPrice(signal.tp[2])}
          </Text>
          {signal.tpHit[2] && <Feather name="check-circle" size={12} color={colors.green} />}
        </View>
      </View>

      <View style={styles.slRrRow}>
        <View style={[styles.slBlock, { backgroundColor: colors.red + "12", borderColor: colors.red + "30" }]}>
          <Text style={[styles.slLabel, { color: colors.textMuted }]}>{t.signalCard.stopLoss}</Text>
          <Text style={[styles.slValue, { color: colors.red }]}>{formatPrice(signal.sl)}</Text>
        </View>
        <View style={[styles.rrBlock, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "30" }]}>
          <Text style={[styles.rrLabel, { color: colors.textMuted }]}>{t.signalCard.rr}</Text>
          <Text style={[styles.rrValue, { color: colors.gold }]}>1 : {signal.rr}</Text>
        </View>
      </View>

      <View style={styles.factorsSection}>
        <Text style={[styles.factorsTitle, { color: colors.textMuted }]}>{t.signalCard.reasons}</Text>
        <View style={styles.factorsWrap}>
          {signal.factors.map((f, i) => (
            <View key={i} style={[styles.factorTag, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "2f" }]}>
              <Feather name="check-circle" size={10} color={colors.primary} />
              <Text style={[styles.factorText, { color: colors.primary }]}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.cardFooter}>
        {signal.whaleActivity && (
          <View style={[styles.footerBadge, { backgroundColor: colors.orange + "20" }]}>
            <MaterialCommunityIcons name="waves" size={12} color={colors.orange} />
            <Text style={[styles.footerBadgeText, { color: colors.orange }]}>{t.signalCard.whaleActivity}</Text>
          </View>
        )}
        {isActive && signal.entryWindowMinutes > 0 && (
          <View style={[styles.footerBadge, { backgroundColor: colors.blue + "20" }]}>
            <Feather name="clock" size={12} color={colors.blue} />
            <Text style={[styles.footerBadgeText, { color: colors.blue }]}>
              {t.signalCard.entryWindow}: {signal.entryWindowMinutes}{t.signalCard.minutes}
            </Text>
          </View>
        )}
        {signal.updateMessage && (
          <View style={[styles.updateBanner, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "33" }]}>
            <Feather name="bell" size={12} color={colors.gold} />
            <Text style={[styles.updateText, { color: colors.gold }]}>{signal.updateMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, marginBottom: 14, overflow: "hidden" },
  topStripe: { height: 4, width: "100%" },
  eliteBanner: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  eliteBannerText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10 },
  headerRight: { flex: 1, gap: 6 },
  badgeRow: { flexDirection: "row", gap: 6, alignItems: "center", flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tfBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tfText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pairText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statusTimeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  priceGrid: { flexDirection: "row", marginHorizontal: 14, marginBottom: 12, gap: 7 },
  priceCell: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 9, alignItems: "center", gap: 3 },
  priceCellLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  priceCellValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  priceCellSub: { fontSize: 9, fontFamily: "Inter_400Regular" },
  slRrRow: { flexDirection: "row", marginHorizontal: 14, marginBottom: 12, gap: 10 },
  slBlock: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  slLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  slValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rrBlock: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  rrLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rrValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  factorsSection: { paddingHorizontal: 14, marginBottom: 10 },
  factorsTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5, marginBottom: 7 },
  factorsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  factorTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  factorText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  cardFooter: { paddingHorizontal: 14, paddingBottom: 14, gap: 7 },
  footerBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
  footerBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  updateBanner: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  updateText: { fontSize: 11, fontFamily: "Inter_500Medium", flex: 1 },
  lockedContent: { alignItems: "center", paddingVertical: 26, paddingHorizontal: 20, gap: 10 },
  lockCircle: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  lockedTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  lockedSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  lockedPair: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginTop: 4 },
  lockedPairText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
