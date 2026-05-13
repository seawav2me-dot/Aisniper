import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useT } from "@/hooks/useT";
import { SignalCard } from "@/components/SignalCard";
import { SentimentGauge } from "@/components/charts/SentimentGauge";
import { SparklineChart } from "@/components/charts/SparklineChart";

function formatPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

const BTC_SPARKLINE = [78200, 79100, 78800, 80100, 79600, 80300, 80730];
const ETH_SPARKLINE = [2280, 2310, 2290, 2340, 2320, 2330, 2327];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { signals, hotCoins, market, user } = useApp();
  const activeSignals = signals.filter((s) => s.status === "ACTIVE" || s.status === "TP1_HIT");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const tierLabel = user.tier === "FREE" ? t.free : user.tier === "VIP" ? t.vip : t.elite;
  const tierColor = user.tier === "FREE" ? colors.textMuted : user.tier === "VIP" ? colors.primary : colors.gold;
  const xpProgress = Math.min((user.xp / 100) * 100, 100);
  const fearGreedLabel = user.language === "en" ? market.fearGreedLabel : market.fearGreedLabel;

  const btcUp = market.btcChange >= 0;
  const ethUp = market.ethChange >= 0;

  const whaleLabel =
    market.whaleActivity === "HIGH" ? t.dashboard.whaleActive
    : market.whaleActivity === "MODERATE" ? t.dashboard.whaleModerate
    : t.dashboard.whaleLow;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity style={[styles.bellBtn, { backgroundColor: colors.secondary }]} activeOpacity={0.7}>
          <Feather name="bell" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.logoText, { color: colors.text }]}>
            <Text style={{ color: colors.primary }}>AI SNIPER</Text>
            <Text style={{ color: colors.gold }}> PRO MAX</Text>
          </Text>
        </View>
        <View style={[styles.tierPill, { backgroundColor: tierColor + "22", borderColor: tierColor + "55" }]}>
          <Text style={[styles.tierPillText, { color: tierColor }]}>{tierLabel}</Text>
        </View>
      </View>

      <View style={styles.levelRow}>
        <View style={styles.levelLeft}>
          <Text style={[styles.levelText, { color: colors.text }]}>
            {t.dashboard.level}<Text style={{ color: colors.primary }}>{user.level}</Text>
          </Text>
          <View style={[styles.xpBarBg, { backgroundColor: colors.secondary }]}>
            <View style={[styles.xpBarFill, { width: `${xpProgress}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.textMuted }]}>{user.xp} XP</Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: colors.gold + "18" }]}>
          <Feather name="zap" size={12} color={colors.gold} />
          <Text style={[styles.streakText, { color: colors.gold }]}>
            {user.streak}{t.dashboard.streak}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.green} />
          <Text style={[styles.statValue, { color: colors.green }]}>{market.winRate}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.dashboard.winRate}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="activity" size={20} color={colors.blue} />
          <Text style={[styles.statValue, { color: colors.blue }]}>{market.totalSignalsToday.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.dashboard.signals}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Feather name="trending-up" size={20} color={colors.gold} />
          <Text style={[styles.statValue, { color: colors.gold }]}>+{market.avgProfit}%</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t.dashboard.avgProfit}</Text>
        </View>
      </View>

      <View style={[styles.sectionBlock, { marginBottom: 16 }]}>
        <View style={styles.sectionTitleRow}>
          <Feather name="activity" size={14} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dashboard.liveMarket}</Text>
          <Animated.View style={[styles.liveDot, { backgroundColor: colors.primary, opacity: pulseAnim }]} />
          <Text style={[styles.liveLabel, { color: colors.primary }]}>{t.dashboard.live}</Text>
        </View>
        <View style={styles.marketRow}>
          <View style={[styles.marketCoin, { backgroundColor: colors.card, borderColor: (btcUp ? colors.green : colors.red) + "44" }]}>
            <View style={styles.coinLeft}>
              <View style={[styles.coinDot, { backgroundColor: btcUp ? colors.green : colors.red }]} />
              <View style={styles.coinInfo}>
                <Text style={[styles.coinSymbol, { color: colors.text }]}>BTC</Text>
                <Text style={[styles.coinPair, { color: colors.textMuted }]}>USDT</Text>
              </View>
            </View>
            <View style={styles.coinRight}>
              <SparklineChart
                data={BTC_SPARKLINE}
                width={64}
                height={32}
                color={btcUp ? colors.green : colors.red}
              />
              <Text style={[styles.coinPrice, { color: colors.text }]}>${formatPrice(market.btcPrice)}</Text>
              <View style={[styles.changeRow, { backgroundColor: (btcUp ? colors.green : colors.red) + "20" }]}>
                <Feather name={btcUp ? "arrow-up" : "arrow-down"} size={10} color={btcUp ? colors.green : colors.red} />
                <Text style={[styles.changeText, { color: btcUp ? colors.green : colors.red }]}>
                  {Math.abs(market.btcChange).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.marketCoin, { backgroundColor: colors.card, borderColor: (ethUp ? colors.green : colors.red) + "44" }]}>
            <View style={styles.coinLeft}>
              <View style={[styles.coinDot, { backgroundColor: ethUp ? colors.green : colors.red }]} />
              <View style={styles.coinInfo}>
                <Text style={[styles.coinSymbol, { color: colors.text }]}>ETH</Text>
                <Text style={[styles.coinPair, { color: colors.textMuted }]}>USDT</Text>
              </View>
            </View>
            <View style={styles.coinRight}>
              <SparklineChart
                data={ETH_SPARKLINE}
                width={64}
                height={32}
                color={ethUp ? colors.green : colors.red}
              />
              <Text style={[styles.coinPrice, { color: colors.text }]}>${formatPrice(market.ethPrice)}</Text>
              <View style={[styles.changeRow, { backgroundColor: (ethUp ? colors.green : colors.red) + "20" }]}>
                <Feather name={ethUp ? "arrow-up" : "arrow-down"} size={10} color={ethUp ? colors.green : colors.red} />
                <Text style={[styles.changeText, { color: ethUp ? colors.green : colors.red }]}>
                  {Math.abs(market.ethChange).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.gaugeRow, { marginBottom: 20 }]}>
        <View style={[styles.gaugeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.gaugeCardTitle, { color: colors.textMuted }]}>{t.dashboard.fearGreed}</Text>
          <SentimentGauge value={Math.round(market.fearGreed)} label={market.fearGreedLabel} size={110} />
        </View>
        <View style={styles.infoStack}>
          <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.infoChipLabel, { color: colors.textMuted }]}>{t.dashboard.btcDom}</Text>
            <Text style={[styles.infoChipValue, { color: colors.blue }]}>{market.dominance}%</Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.infoChipLabel, { color: colors.textMuted }]}>{t.dashboard.whales}</Text>
            <Text style={[styles.infoChipValue, { color: market.whaleActivity === "HIGH" ? colors.orange : colors.gold }]}>
              {whaleLabel}
            </Text>
          </View>
          <View style={[styles.infoChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.infoChipLabel, { color: colors.textMuted }]}>AI Mode</Text>
            <Text style={[styles.infoChipValue, { color: colors.green }]}>
              {market.aiMode === "ACTIVE" ? "ACTIVE" : "SCANNING"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <Feather name="zap" size={14} color={colors.gold} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dashboard.latestSignals}</Text>
          <Animated.View style={[styles.liveDot, { backgroundColor: colors.green, opacity: pulseAnim }]} />
          <Text style={[styles.liveLabel, { color: colors.green }]}>{t.dashboard.live}</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>{activeSignals.length}</Text>
          </View>
        </View>

        {activeSignals.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="radar" size={36} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t.dashboard.scanning}</Text>
          </View>
        ) : (
          activeSignals.slice(0, 2).map((s) => <SignalCard key={s.id} signal={s} />)
        )}
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="fire" size={14} color={colors.orange} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dashboard.heatmap}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatRow}>
          {hotCoins.map((coin) => {
            const isUp = coin.change24h >= 0;
            const intensity = Math.min(Math.abs(coin.change24h) / 10, 1);
            const bg = isUp
              ? `rgba(0,230,118,${0.07 + intensity * 0.20})`
              : `rgba(255,79,79,${0.07 + intensity * 0.20})`;
            return (
              <View key={coin.symbol} style={[styles.heatCell, { backgroundColor: bg, borderColor: (isUp ? colors.green : colors.red) + "44" }]}>
                <Text style={[styles.heatSymbol, { color: colors.text }]}>{coin.symbol}</Text>
                <Text style={[styles.heatChange, { color: isUp ? colors.green : colors.red }]}>
                  {isUp ? "+" : ""}{coin.change24h.toFixed(1)}%
                </Text>
                <Text style={[styles.heatScore, { color: colors.primary }]}>AI {coin.aiScore}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBlock}>
        <View style={styles.sectionTitleRow}>
          <Feather name="alert-circle" size={14} color={colors.orange} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.dashboard.marketAlerts}</Text>
          <Animated.View style={[styles.liveDot, { backgroundColor: colors.orange, opacity: pulseAnim }]} />
        </View>
        {t.dashboard.alerts.map((msg: string, i: number) => {
          const alertColors = [colors.orange, colors.green, colors.gold];
          return (
            <View key={i} style={[styles.alertRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.alertDot, { backgroundColor: alertColors[i % alertColors.length] }]} />
              <Text style={[styles.alertText, { color: colors.text }]}>{msg}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  bellBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  logoText: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  tierPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tierPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  levelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  levelLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  levelText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  xpBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden", maxWidth: 120 },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  streakText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  sectionBlock: { marginBottom: 22 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  marketRow: { gap: 10 },
  marketCoin: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coinLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  coinDot: { width: 8, height: 8, borderRadius: 4 },
  coinInfo: {},
  coinSymbol: { fontSize: 16, fontFamily: "Inter_700Bold" },
  coinPair: { fontSize: 11, fontFamily: "Inter_400Regular" },
  coinRight: { alignItems: "flex-end", gap: 3 },
  coinPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  changeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  gaugeRow: { flexDirection: "row", gap: 10 },
  gaugeCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: "center" },
  gaugeCardTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  infoStack: { flex: 1, gap: 8 },
  infoChip: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, justifyContent: "center", alignItems: "center", gap: 3 },
  infoChipLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  infoChipValue: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  heatRow: { paddingRight: 4, gap: 8 },
  heatCell: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4, minWidth: 78 },
  heatSymbol: { fontSize: 13, fontFamily: "Inter_700Bold" },
  heatChange: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  heatScore: { fontSize: 10, fontFamily: "Inter_500Medium" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
});
