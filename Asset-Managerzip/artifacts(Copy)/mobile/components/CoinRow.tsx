import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { HotCoin } from "@/context/AppContext";

function formatPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toFixed(1);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatVolume(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return `${(n / 1_000).toFixed(0)}K`;
}

export function CoinRow({ coin, rank }: { coin: HotCoin; rank: number }) {
  const colors = useColors();
  const isUp = coin.change24h >= 0;
  const changeColor = isUp ? colors.green : colors.red;
  const trendColor = coin.trend === "BULLISH" ? colors.green : coin.trend === "BEARISH" ? colors.red : colors.gold;
  const scoreColor = coin.aiScore >= 85 ? colors.green : coin.aiScore >= 70 ? colors.primary : coin.aiScore >= 55 ? colors.gold : colors.red;

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.rank, { color: colors.textDim }]}>#{rank}</Text>

      <View style={[styles.symbolBox, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.symbolText, { color: colors.primary }]}>{coin.symbol.slice(0, 2)}</Text>
      </View>

      <View style={styles.nameBlock}>
        <Text style={[styles.symbol, { color: colors.text }]}>{coin.symbol}</Text>
        <Text style={[styles.name, { color: colors.textMuted }]}>{coin.name}</Text>
      </View>

      <View style={styles.priceBlock}>
        <Text style={[styles.price, { color: colors.text }]}>${formatPrice(coin.price)}</Text>
        <View style={styles.changeRow}>
          <Feather name={isUp ? "arrow-up" : "arrow-down"} size={10} color={changeColor} />
          <Text style={[styles.change, { color: changeColor }]}>{Math.abs(coin.change24h).toFixed(1)}%</Text>
        </View>
      </View>

      <View style={styles.statsBlock}>
        <View style={[styles.trendBadge, { backgroundColor: trendColor + "22" }]}>
          <Text style={[styles.trendText, { color: trendColor }]}>{coin.trend}</Text>
        </View>
        <Text style={[styles.volume, { color: colors.textMuted }]}>{formatVolume(coin.volume)}</Text>
      </View>

      <View style={styles.scoreBlock}>
        <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>AI</Text>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{coin.aiScore}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  rank: { fontSize: 12, fontFamily: "Inter_500Medium", width: 24 },
  symbolBox: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  symbolText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  nameBlock: { flex: 1, gap: 2 },
  symbol: { fontSize: 14, fontFamily: "Inter_700Bold" },
  name: { fontSize: 11, fontFamily: "Inter_400Regular" },
  priceBlock: { alignItems: "flex-end", gap: 2 },
  price: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  change: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statsBlock: { alignItems: "flex-end", gap: 4 },
  trendBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  trendText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  volume: { fontSize: 10, fontFamily: "Inter_400Regular" },
  scoreBlock: { alignItems: "center", width: 32 },
  scoreLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  scoreValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
