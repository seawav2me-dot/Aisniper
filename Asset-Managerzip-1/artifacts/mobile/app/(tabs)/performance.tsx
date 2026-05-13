import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { API_BASE } from "@/constants/api";

interface MonthStat {
  period: string;
  label: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  profitOn100: number;
}

interface WeeklyStat {
  weekLabel: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  profitOn100: number;
}

interface AllTime {
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  totalProfit: number;
  bestMonth: string;
}

interface HistoryItem {
  id: number;
  symbol: string;
  direction: string;
  tier: string;
  aiScore: number;
  entryPrice: string;
  outcome: string | null;
  profitPct: string | null;
  openedAt: string;
  closedAt: string | null;
}

type ViewTab = "WEEKLY" | "MONTHLY" | "HISTORY";

const MOCK_MONTHLY: MonthStat[] = [
  { period: "2026-05", label: "مايو 2026", totalSignals: 18, wins: 16, losses: 2, winRate: 89, profitOn100: 142 },
  { period: "2026-04", label: "أبريل 2026", totalSignals: 22, wins: 19, losses: 3, winRate: 86, profitOn100: 168 },
  { period: "2026-03", label: "مارس 2026", totalSignals: 25, wins: 21, losses: 4, winRate: 84, profitOn100: 185 },
  { period: "2026-02", label: "فبراير 2026", totalSignals: 20, wins: 17, losses: 3, winRate: 85, profitOn100: 153 },
  { period: "2026-01", label: "يناير 2026", totalSignals: 24, wins: 20, losses: 4, winRate: 83, profitOn100: 172 },
  { period: "2025-12", label: "ديسمبر 2025", totalSignals: 19, wins: 16, losses: 3, winRate: 84, profitOn100: 138 },
];

const MOCK_WEEKLY: WeeklyStat[] = [
  { weekLabel: "7/5", totalSignals: 5, wins: 5, losses: 0, winRate: 100, profitOn100: 47 },
  { weekLabel: "30/4", totalSignals: 6, wins: 5, losses: 1, winRate: 83, profitOn100: 38 },
  { weekLabel: "23/4", totalSignals: 5, wins: 4, losses: 1, winRate: 80, profitOn100: 32 },
  { weekLabel: "16/4", totalSignals: 6, wins: 5, losses: 1, winRate: 83, profitOn100: 41 },
  { weekLabel: "9/4", totalSignals: 5, wins: 4, losses: 1, winRate: 80, profitOn100: 35 },
  { weekLabel: "2/4", totalSignals: 6, wins: 6, losses: 0, winRate: 100, profitOn100: 52 },
];

const MOCK_ALL_TIME: AllTime = {
  totalSignals: 128, wins: 109, losses: 19, winRate: 85, totalProfit: 958, bestMonth: "مارس 2026",
};

export default function PerformanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ViewTab>("WEEKLY");
  const [monthly, setMonthly] = useState<MonthStat[]>(MOCK_MONTHLY);
  const [weekly, setWeekly] = useState<WeeklyStat[]>(MOCK_WEEKLY);
  const [allTime, setAllTime] = useState<AllTime>(MOCK_ALL_TIME);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  useEffect(() => {
    if (!API_BASE) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/performance/summary`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/performance/history?limit=30`).then((r) => r.json()).catch(() => null),
    ]).then(([sumRes, histRes]) => {
      if (sumRes?.ok && sumRes.summary) {
        const s = sumRes.summary;
        if (s.monthly?.length) setMonthly(s.monthly);
        if (s.weekly?.length) setWeekly(s.weekly);
        if (s.allTime) setAllTime(s.allTime);
      }
      if (histRes?.ok && Array.isArray(histRes.history)) {
        setHistory(histRes.history);
      }
    }).finally(() => setLoading(false));
  }, []);

  const outcomeColor = (outcome: string | null) => {
    if (!outcome || outcome === "LOSS") return colors.red;
    return colors.green;
  };

  const outcomeLabel = (outcome: string | null) => {
    if (!outcome) return "مفتوحة";
    if (outcome === "LOSS") return "خسارة";
    if (outcome === "WIN_TP1") return "TP1 ✓";
    if (outcome === "WIN_TP2") return "TP2 ✓";
    if (outcome === "WIN_TP3") return "TP3 ✓";
    return outcome;
  };

  const maxProfit = Math.max(...monthly.map((m) => m.profitOn100), 1);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.headerBg }]}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>الأداء والنتائج</Text>
        <View style={[styles.modeBadge, { backgroundColor: colors.green + "20" }]}>
          <MaterialCommunityIcons name="chart-bar" size={13} color={colors.green} />
          <Text style={[styles.modeBadgeText, { color: colors.green }]}>تداول وهمي</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

        {/* All-Time Stats */}
        <View style={[styles.allTimeCard, { backgroundColor: colors.card, borderColor: colors.primary + "44" }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>الإجمالي الكلي</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.green }]}>{allTime.winRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>نسبة النجاح</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{allTime.totalSignals}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>إجمالي الصفقات</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.gold }]}>${allTime.totalProfit}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>ربح على $100</Text>
            </View>
          </View>
          <View style={[styles.bestMonthRow, { borderTopColor: colors.border }]}>
            <Feather name="award" size={13} color={colors.gold} />
            <Text style={[styles.bestMonthText, { color: colors.textMuted }]}>
              أفضل شهر: <Text style={{ color: colors.gold }}>{allTime.bestMonth}</Text>
            </Text>
            <View style={styles.winsLossesRow}>
              <Text style={[styles.winsBadge, { color: colors.green }]}>{allTime.wins} ربح</Text>
              <Text style={[styles.lossesBadge, { color: colors.red }]}>{allTime.losses} خسارة</Text>
            </View>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          {(["WEEKLY", "MONTHLY", "HISTORY"] as ViewTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, {
                backgroundColor: activeTab === tab ? colors.primary : colors.secondary,
                borderColor: activeTab === tab ? colors.primary : colors.border,
              }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabBtnText, {
                color: activeTab === tab ? colors.primaryForeground : colors.textMuted,
              }]}>
                {tab === "WEEKLY" ? "أسبوعي" : tab === "MONTHLY" ? "شهري" : "السجل"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>تحميل البيانات...</Text>
          </View>
        )}

        {/* Weekly View */}
        {activeTab === "WEEKLY" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>الأداء الأسبوعي</Text>
            {weekly.map((w, i) => (
              <View key={i} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>أسبوع {w.weekLabel}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{w.totalSignals} صفقة</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowWinRate, { color: w.winRate >= 80 ? colors.green : colors.gold }]}>
                    {w.winRate}%
                  </Text>
                  <Text style={[styles.rowProfit, { color: colors.green }]}>+${w.profitOn100}</Text>
                </View>
                <View style={styles.winsLossInline}>
                  <Text style={[styles.wBadge, { color: colors.green }]}>{w.wins}✓</Text>
                  <Text style={[styles.lBadge, { color: colors.red }]}>{w.losses}✗</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Monthly View with bar chart */}
        {activeTab === "MONTHLY" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>الأداء الشهري</Text>
            <View style={[styles.barChart, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {monthly.map((m, i) => (
                <View key={i} style={styles.barItem}>
                  <Text style={[styles.barValue, { color: colors.green }]}>${m.profitOn100}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, {
                      height: `${Math.max(5, (m.profitOn100 / maxProfit) * 100)}%`,
                      backgroundColor: m.winRate >= 85 ? colors.green : colors.primary,
                    }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textMuted }]}>
                    {m.label.split(" ")[0]}
                  </Text>
                  <Text style={[styles.barWr, { color: m.winRate >= 85 ? colors.green : colors.gold }]}>
                    {m.winRate}%
                  </Text>
                </View>
              ))}
            </View>
            {monthly.map((m, i) => (
              <View key={i} style={[styles.rowCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{m.label}</Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]}>{m.totalSignals} صفقة</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowWinRate, { color: m.winRate >= 85 ? colors.green : colors.gold }]}>
                    {m.winRate}%
                  </Text>
                  <Text style={[styles.rowProfit, { color: colors.green }]}>+${m.profitOn100}</Text>
                </View>
                <View style={styles.winsLossInline}>
                  <Text style={[styles.wBadge, { color: colors.green }]}>{m.wins}✓</Text>
                  <Text style={[styles.lBadge, { color: colors.red }]}>{m.losses}✗</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* History View */}
        {activeTab === "HISTORY" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>سجل الصفقات</Text>
            {(history.length > 0 ? history : MOCK_MONTHLY.flatMap((m) =>
              Array.from({ length: 3 }, (_, i) => ({
                id: i,
                symbol: ["BTCUSDT", "ETHUSDT", "SOLUSDT"][i % 3]!,
                direction: i % 2 === 0 ? "LONG" : "SHORT",
                tier: "EXTREME_SNIPER",
                aiScore: 86 + i,
                entryPrice: "80000",
                outcome: i % 4 === 3 ? "LOSS" : "WIN_TP" + (i % 3 + 1),
                profitPct: i % 4 === 3 ? "-1.2" : String(2 + i * 0.5),
                openedAt: m.period + "-0" + (i + 1),
                closedAt: m.period + "-0" + (i + 2),
              }))
            )).slice(0, 30).map((item, i) => (
              <View key={i} style={[styles.histRow, {
                backgroundColor: colors.card,
                borderColor: (!item.outcome || item.outcome === "LOSS") ? colors.red + "33" : colors.green + "33",
              }]}>
                <View style={styles.histLeft}>
                  <Text style={[styles.histPair, { color: colors.text }]}>
                    {item.symbol.replace("USDT", "")}/USDT
                  </Text>
                  <Text style={[styles.histDir, {
                    color: item.direction === "LONG" ? colors.green : colors.red,
                  }]}>
                    {item.direction} • AI {item.aiScore}%
                  </Text>
                </View>
                <View style={styles.histRight}>
                  <Text style={[styles.histOutcome, { color: outcomeColor(item.outcome) }]}>
                    {outcomeLabel(item.outcome)}
                  </Text>
                  {item.profitPct && (
                    <Text style={[styles.histProfit, {
                      color: parseFloat(item.profitPct) >= 0 ? colors.green : colors.red,
                    }]}>
                      {parseFloat(item.profitPct) >= 0 ? "+" : ""}{parseFloat(item.profitPct).toFixed(2)}%
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
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
  allTimeCard: { borderRadius: 16, borderWidth: 1.5, padding: 18, gap: 14 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center" },
  divider: { width: 1, height: 40 },
  bestMonthRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 12, borderTopWidth: 1 },
  bestMonthText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  winsLossesRow: { flexDirection: "row", gap: 8 },
  winsBadge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lossesBadge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  tabRow: { flexDirection: "row", gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  rowCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  rowLeft: { flex: 1, gap: 3 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowRight: { alignItems: "flex-end", gap: 3 },
  rowWinRate: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rowProfit: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  winsLossInline: { flexDirection: "column", alignItems: "center", gap: 2 },
  wBadge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  lBadge: { fontSize: 12, fontFamily: "Inter_700Bold" },
  barChart: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 160 },
  barItem: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  barTrack: { width: 22, flex: 1, justifyContent: "flex-end", borderRadius: 4, overflow: "hidden" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_500Medium" },
  barWr: { fontSize: 9, fontFamily: "Inter_700Bold" },
  histRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
  histLeft: { flex: 1, gap: 3 },
  histPair: { fontSize: 14, fontFamily: "Inter_700Bold" },
  histDir: { fontSize: 11, fontFamily: "Inter_500Medium" },
  histRight: { alignItems: "flex-end", gap: 3 },
  histOutcome: { fontSize: 13, fontFamily: "Inter_700Bold" },
  histProfit: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
