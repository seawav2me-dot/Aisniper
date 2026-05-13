import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { PaperTrade } from "@/context/AppContext";

function formatPrice(n: number) {
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function formatPnl(pnl: number) {
  return (pnl >= 0 ? "+" : "") + pnl.toFixed(2);
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `منذ ${d}ي`;
  if (h > 0) return `منذ ${h}س`;
  if (m > 0) return `منذ ${m}د`;
  return "الآن";
}

type TradeTab = "OPEN" | "CLOSED";

export default function PaperTradingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { paperTrades, paperBalance, signals, openPaperTrade, closePaperTrade, user } = useApp();
  const [activeTab, setActiveTab] = useState<TradeTab>("OPEN");

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const openTrades = paperTrades.filter((t) => t.status === "OPEN");
  const closedTrades = paperTrades.filter((t) => t.status !== "OPEN");

  const totalPnl = closedTrades.reduce((acc, t) => acc + (t.pnl ?? 0), 0);
  const winCount = closedTrades.filter((t) => t.status === "CLOSED_WIN").length;
  const winRate = closedTrades.length > 0 ? ((winCount / closedTrades.length) * 100).toFixed(0) : "—";

  const activeSignals = signals.filter((s) => s.status === "ACTIVE" || s.status === "TP1_HIT");

  const handleOpenTrade = (signal: typeof signals[0]) => {
    if (user.tier === "FREE") {
      Alert.alert("VIP فقط", "التداول الوهمي المتقدم متاح لمشتركي VIP فقط.\n\nيمكنك فتح صفقة تجريبية واحدة مجانياً.");
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `فتح صفقة — ${signal.pair}`,
      `الاتجاه: ${signal.direction === "LONG" ? "شراء" : "بيع"}\nسعر الدخول: ${formatPrice(signal.entry.high)}\nحجم الصفقة: $100\nرافعة: x2`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "فتح الصفقة",
          onPress: () => {
            openPaperTrade({
              pair: signal.pair,
              direction: signal.direction,
              entryPrice: signal.entry.high,
              size: 100,
              leverage: 2,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleCloseTrade = (trade: PaperTrade) => {
    const currentPrice = trade.entryPrice * (1 + (Math.random() - 0.4) * 0.05);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `إغلاق الصفقة — ${trade.pair}`,
      `السعر الحالي: ${formatPrice(currentPrice)}\nسيتم إغلاق الصفقة بهذا السعر.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إغلاق",
          onPress: () => {
            closePaperTrade(trade.id, currentPrice);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.headerBg }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>تداول وهمي</Text>
        <View style={[styles.modeBadge, { backgroundColor: colors.primary + "18" }]}>
          <MaterialCommunityIcons name="chart-line" size={13} color={colors.primary} />
          <Text style={[styles.modeBadgeText, { color: colors.primary }]}>بدون مخاطر</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>الرصيد الافتراضي</Text>
          <Text style={[styles.balanceVal, { color: colors.text }]}>${paperBalance.toFixed(2)}</Text>
          <View style={styles.balanceStats}>
            <View style={styles.bStat}>
              <Text style={[styles.bStatVal, { color: totalPnl >= 0 ? colors.green : colors.red }]}>
                {formatPnl(totalPnl)} $
              </Text>
              <Text style={[styles.bStatLabel, { color: colors.textMuted }]}>الربح/الخسارة الكلي</Text>
            </View>
            <View style={[styles.bDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bStat}>
              <Text style={[styles.bStatVal, { color: colors.blue }]}>{openTrades.length}</Text>
              <Text style={[styles.bStatLabel, { color: colors.textMuted }]}>صفقات مفتوحة</Text>
            </View>
            <View style={[styles.bDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bStat}>
              <Text style={[styles.bStatVal, { color: colors.green }]}>{winRate}%</Text>
              <Text style={[styles.bStatLabel, { color: colors.textMuted }]}>نسبة النجاح</Text>
            </View>
          </View>
        </View>

        {activeSignals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>افتح صفقة من الإشارات النشطة</Text>
            {activeSignals.map((signal) => (
              <TouchableOpacity
                key={signal.id}
                style={[styles.signalRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => handleOpenTrade(signal)}
                activeOpacity={0.8}
              >
                <View style={styles.sigLeft}>
                  <Text style={[styles.sigPair, { color: colors.text }]}>{signal.pair.replace("USDT", "")}/USDT</Text>
                  <Text style={[styles.sigEntry, { color: colors.textMuted }]}>دخول: {formatPrice(signal.entry.high)}</Text>
                </View>
                <View style={styles.sigRight}>
                  <View style={[styles.dirChip, {
                    backgroundColor: signal.direction === "LONG" ? colors.green + "20" : colors.red + "20",
                  }]}>
                    <Feather name={signal.direction === "LONG" ? "trending-up" : "trending-down"} size={12}
                      color={signal.direction === "LONG" ? colors.green : colors.red} />
                    <Text style={[styles.dirChipText, { color: signal.direction === "LONG" ? colors.green : colors.red }]}>
                      {signal.direction === "LONG" ? "شراء" : "بيع"}
                    </Text>
                  </View>
                  <Text style={[styles.scoreChip, { color: colors.primary }]}>{signal.score}/100</Text>
                  <Feather name="plus-circle" size={18} color={colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.tabRow}>
          {(["OPEN", "CLOSED"] as TradeTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, {
                backgroundColor: activeTab === tab ? colors.primary : colors.secondary,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === tab ? colors.primaryForeground : colors.textMuted }]}>
                {tab === "OPEN" ? `صفقات مفتوحة (${openTrades.length})` : `مغلقة (${closedTrades.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "OPEN" && (
          openTrades.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
              <MaterialCommunityIcons name="chart-line" size={40} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>لا توجد صفقات مفتوحة</Text>
              <Text style={[styles.emptySub, { color: colors.textDim }]}>افتح صفقة من الإشارات النشطة أعلاه</Text>
            </View>
          ) : openTrades.map((trade) => {
            const mockCurrentPrice = trade.entryPrice * (1 + (Math.random() - 0.4) * 0.03);
            const mockPnl = trade.direction === "LONG"
              ? ((mockCurrentPrice - trade.entryPrice) / trade.entryPrice) * trade.size * trade.leverage
              : ((trade.entryPrice - mockCurrentPrice) / trade.entryPrice) * trade.size * trade.leverage;
            return (
              <View key={trade.id} style={[styles.tradeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.tradeHeader}>
                  <View style={styles.tradeLeft}>
                    <Text style={[styles.tradePair, { color: colors.text }]}>{trade.pair.replace("USDT", "")}/USDT</Text>
                    <Text style={[styles.tradeTime, { color: colors.textMuted }]}>{formatTimeAgo(trade.openedAt)}</Text>
                  </View>
                  <View style={styles.tradeRight}>
                    <View style={[styles.dirChip, {
                      backgroundColor: trade.direction === "LONG" ? colors.green + "20" : colors.red + "20",
                    }]}>
                      <Text style={[styles.dirChipText, { color: trade.direction === "LONG" ? colors.green : colors.red }]}>
                        {trade.direction === "LONG" ? "شراء" : "بيع"} x{trade.leverage}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.tradePrices}>
                  <View style={styles.tradePriceItem}>
                    <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>سعر الدخول</Text>
                    <Text style={[styles.tradePriceVal, { color: colors.text }]}>{formatPrice(trade.entryPrice)}</Text>
                  </View>
                  <View style={styles.tradePriceItem}>
                    <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>الحجم</Text>
                    <Text style={[styles.tradePriceVal, { color: colors.text }]}>${trade.size}</Text>
                  </View>
                  <View style={styles.tradePriceItem}>
                    <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>ر/خ تقديري</Text>
                    <Text style={[styles.tradePriceVal, { color: mockPnl >= 0 ? colors.green : colors.red }]}>
                      {formatPnl(mockPnl)} $
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.red + "20", borderColor: colors.red + "44" }]}
                  onPress={() => handleCloseTrade(trade)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.closeBtnText, { color: colors.red }]}>إغلاق الصفقة</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {activeTab === "CLOSED" && (
          closedTrades.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
              <Feather name="archive" size={40} color={colors.textDim} />
              <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>لا توجد صفقات مغلقة بعد</Text>
            </View>
          ) : closedTrades.map((trade) => (
            <View key={trade.id} style={[styles.tradeCard, { backgroundColor: colors.card, borderColor: trade.status === "CLOSED_WIN" ? colors.green + "33" : colors.red + "33" }]}>
              <View style={styles.tradeHeader}>
                <View style={styles.tradeLeft}>
                  <Text style={[styles.tradePair, { color: colors.text }]}>{trade.pair.replace("USDT", "")}/USDT</Text>
                  <Text style={[styles.tradeTime, { color: colors.textMuted }]}>{trade.closedAt ? formatTimeAgo(trade.closedAt) : ""}</Text>
                </View>
                <View style={[styles.pnlBadge, {
                  backgroundColor: trade.status === "CLOSED_WIN" ? colors.green + "20" : colors.red + "20",
                }]}>
                  <Text style={[styles.pnlBadgeText, { color: trade.status === "CLOSED_WIN" ? colors.green : colors.red }]}>
                    {formatPnl(trade.pnl ?? 0)} $
                  </Text>
                </View>
              </View>
              <View style={styles.tradePrices}>
                <View style={styles.tradePriceItem}>
                  <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>دخول</Text>
                  <Text style={[styles.tradePriceVal, { color: colors.text }]}>{formatPrice(trade.entryPrice)}</Text>
                </View>
                <View style={styles.tradePriceItem}>
                  <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>خروج</Text>
                  <Text style={[styles.tradePriceVal, { color: colors.text }]}>{formatPrice(trade.exitPrice ?? 0)}</Text>
                </View>
                <View style={styles.tradePriceItem}>
                  <Text style={[styles.tradePriceLabel, { color: colors.textMuted }]}>النتيجة</Text>
                  <Text style={[styles.tradePriceVal, { color: trade.status === "CLOSED_WIN" ? colors.green : colors.red }]}>
                    {trade.status === "CLOSED_WIN" ? "ربح" : "خسارة"}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 16 },
  balanceCard: { borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 14 },
  balanceLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  balanceVal: { fontSize: 34, fontFamily: "Inter_700Bold" },
  balanceStats: { flexDirection: "row", alignItems: "center" },
  bStat: { flex: 1, alignItems: "center", gap: 4 },
  bStatVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  bStatLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bDivider: { width: 1, height: 36 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  signalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1 },
  sigLeft: { gap: 4 },
  sigPair: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sigEntry: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sigRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  dirChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dirChipText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  scoreChip: { fontSize: 12, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyBox: { alignItems: "center", padding: 48, gap: 10, borderRadius: 14, borderWidth: 1, borderStyle: "dashed" },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  tradeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  tradeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tradeLeft: { gap: 3 },
  tradePair: { fontSize: 16, fontFamily: "Inter_700Bold" },
  tradeTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tradeRight: {},
  tradePrices: { flexDirection: "row" },
  tradePriceItem: { flex: 1, gap: 4 },
  tradePriceLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tradePriceVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  closeBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  closeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  pnlBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pnlBadgeText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
