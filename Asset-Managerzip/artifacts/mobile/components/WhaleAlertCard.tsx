import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { WhaleAlert } from "@/context/AppContext";

function formatUSD(amount: number) {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

function getTypeConfig(type: WhaleAlert["type"], colors: ReturnType<typeof useColors>) {
  switch (type) {
    case "LARGE_BUY":
      return { label: "LARGE BUY", icon: "trending-up" as const, color: colors.green };
    case "LARGE_SELL":
      return { label: "LARGE SELL", icon: "trending-down" as const, color: colors.red };
    case "LIQUIDITY_HUNT":
      return { label: "LIQUIDITY HUNT", icon: "alert-triangle" as const, color: colors.orange };
    case "WHALE_ACCUMULATION":
      return { label: "ACCUMULATION", icon: "layers" as const, color: colors.primary };
    case "EXCHANGE_INFLOW":
      return { label: "EXCHANGE INFLOW", icon: "arrow-right-circle" as const, color: colors.purple };
  }
}

function getSigColor(sig: WhaleAlert["significance"], colors: ReturnType<typeof useColors>) {
  switch (sig) {
    case "EXTREME": return colors.red;
    case "CRITICAL": return colors.orange;
    case "HIGH": return colors.gold;
  }
}

export function WhaleAlertCard({ alert }: { alert: WhaleAlert }) {
  const colors = useColors();
  const cfg = getTypeConfig(alert.type, colors);
  const sigColor = getSigColor(alert.significance, colors);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.iconBox, { backgroundColor: cfg.color + "1a" }]}>
        <Feather name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <View style={[styles.sigBadge, { backgroundColor: sigColor + "22" }]}>
            <Text style={[styles.sigText, { color: sigColor }]}>{alert.significance}</Text>
          </View>
        </View>
        <View style={styles.middleRow}>
          <Text style={[styles.pair, { color: colors.text }]}>{alert.pair}</Text>
          <Text style={[styles.amount, { color: colors.gold }]}>{formatUSD(alert.amountUSD)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <View style={styles.exchangeRow}>
            <MaterialCommunityIcons name="bank-outline" size={11} color={colors.textMuted} />
            <Text style={[styles.exchange, { color: colors.textMuted }]}>{alert.exchange}</Text>
          </View>
          <Text style={[styles.time, { color: colors.textDim }]}>{formatTimeAgo(alert.timestamp)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  sigBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  sigText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  middleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pair: { fontSize: 16, fontFamily: "Inter_700Bold" },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exchangeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  exchange: { fontSize: 11, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
