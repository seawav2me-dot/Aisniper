import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { WhaleAlertCard } from "@/components/WhaleAlertCard";

function formatUSD(amount: number) {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

export default function WhaleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { whaleAlerts, market } = useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    const wave = Animated.loop(
      Animated.timing(waveAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    );
    pulse.start();
    wave.start();
    return () => { pulse.stop(); wave.stop(); };
  }, []);

  const waveScale = waveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.3, 0.8] });

  const totalFlow = whaleAlerts.reduce((sum, a) => sum + a.amountUSD, 0);
  const buys = whaleAlerts.filter((a) => a.type === "LARGE_BUY" || a.type === "WHALE_ACCUMULATION");
  const sells = whaleAlerts.filter((a) => a.type === "LARGE_SELL");
  const buyFlow = buys.reduce((sum, a) => sum + a.amountUSD, 0);
  const sellFlow = sells.reduce((sum, a) => sum + a.amountUSD, 0);

  const extremeAlerts = whaleAlerts.filter((a) => a.significance === "EXTREME" || a.significance === "CRITICAL");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.headerBg }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.text }]}>Whale Tracker</Text>
          <View style={styles.activityBadge}>
            <Animated.View style={[styles.activityDot, { backgroundColor: colors.orange, opacity: pulseAnim }]} />
            <Text style={[styles.activityText, { color: colors.orange }]}>
              {market.whaleActivity} ACTIVITY
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.flowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.flowCardHeader}>
            <Animated.View style={[styles.whaleIcon, { transform: [{ scale: waveScale }] }]}>
              <MaterialCommunityIcons name="waves" size={28} color={colors.primary} />
            </Animated.View>
            <View style={styles.flowInfo}>
              <Text style={[styles.flowLabel, { color: colors.textMuted }]}>24H WHALE FLOW</Text>
              <Text style={[styles.flowTotal, { color: colors.text }]}>{formatUSD(totalFlow)}</Text>
            </View>
          </View>

          <View style={styles.flowBar}>
            <View style={[styles.flowFillBuy, {
              flex: buyFlow,
              backgroundColor: colors.green,
              borderRadius: 4,
            }]} />
            <View style={[styles.flowFillSell, {
              flex: sellFlow,
              backgroundColor: colors.red,
              borderRadius: 4,
            }]} />
          </View>

          <View style={styles.flowLegend}>
            <View style={styles.flowLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Buy Flow</Text>
              <Text style={[styles.legendValue, { color: colors.green }]}>{formatUSD(buyFlow)}</Text>
            </View>
            <View style={styles.flowLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.red }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Sell Flow</Text>
              <Text style={[styles.legendValue, { color: colors.red }]}>{formatUSD(sellFlow)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Feather name="alert-triangle" size={18} color={colors.red} />
            <Text style={[styles.statValue, { color: colors.text }]}>{extremeAlerts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Critical</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="waves" size={18} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{whaleAlerts.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Alerts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Feather name="layers" size={18} color={colors.orange} />
            <Text style={[styles.statValue, { color: colors.text }]}>{buys.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Accumul.</Text>
          </View>
        </View>

        {extremeAlerts.length > 0 && (
          <View style={[styles.extremeWarning, { backgroundColor: colors.red + "15", borderColor: colors.red + "33" }]}>
            <Feather name="alert-octagon" size={16} color={colors.red} />
            <Text style={[styles.extremeText, { color: colors.red }]}>
              {extremeAlerts.length} EXTREME/CRITICAL whale movements detected — High market impact likely
            </Text>
          </View>
        )}

        <Text style={[styles.feedTitle, { color: colors.textMuted }]}>LIVE WHALE FEED</Text>
        {whaleAlerts.map((alert) => (
          <WhaleAlertCard key={alert.id} alert={alert} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  activityBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  content: { padding: 16, gap: 14 },
  flowCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  flowCardHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  whaleIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(0,212,170,0.1)", alignItems: "center", justifyContent: "center" },
  flowInfo: { gap: 4 },
  flowLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  flowTotal: { fontSize: 28, fontFamily: "Inter_700Bold" },
  flowBar: { height: 8, borderRadius: 4, flexDirection: "row", gap: 2, overflow: "hidden" },
  flowFillBuy: { height: "100%" },
  flowFillSell: { height: "100%" },
  flowLegend: { flexDirection: "row", justifyContent: "space-around" },
  flowLegendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  legendValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  extremeWarning: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  extremeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  feedTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
});
