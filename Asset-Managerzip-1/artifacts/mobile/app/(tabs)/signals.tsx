import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, Signal, SignalQualityFilter } from "@/context/AppContext";
import { SignalCard } from "@/components/SignalCard";
import { useT } from "@/hooks/useT";

type FilterKey = "ALL" | "LONG" | "SHORT" | "ACTIVE" | "CLOSED";

const FREE_SIGNAL_LIMIT = 2;
const FREE_SIGNAL_DELAY_MS = 30 * 60 * 1000;

function filterByDirection(signals: Signal[], filter: FilterKey): Signal[] {
  switch (filter) {
    case "LONG": return signals.filter((s) => s.direction === "LONG");
    case "SHORT": return signals.filter((s) => s.direction === "SHORT");
    case "ACTIVE": return signals.filter((s) => ["ACTIVE", "TP1_HIT", "TP2_HIT"].includes(s.status));
    case "CLOSED": return signals.filter((s) => ["CLOSED_WIN", "CLOSED_LOSS", "TP3_HIT", "SL_HIT"].includes(s.status));
    default: return signals;
  }
}

function filterByQuality(signals: Signal[], quality: SignalQualityFilter): Signal[] {
  switch (quality) {
    case "GOOD": return signals.filter((s) => s.score >= 70);
    case "HIGH": return signals.filter((s) => s.score >= 80);
    case "ELITE": return signals.filter((s) => s.score >= 90);
    default: return signals;
  }
}

export default function SignalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { signals, market, user, setSignalQualityFilter, eliteSignalCount } = useApp();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const elitePulse = useRef(new Animated.Value(1)).current;

  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const isFree = user.tier === "FREE";
  const qualityFilter = user.signalQualityFilter ?? "ALL";

  useEffect(() => {
    if (eliteSignalCount > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(elitePulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
          Animated.timing(elitePulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [eliteSignalCount]);

  const directionFiltered = filterByDirection(signals, activeFilter);
  const qualityFiltered = filterByQuality(directionFiltered, qualityFilter);

  const visibleSignals = isFree ? qualityFiltered.slice(0, FREE_SIGNAL_LIMIT) : qualityFiltered;
  const delayedSignals = isFree
    ? visibleSignals.map((s) => ({ ...s, timestamp: s.timestamp - FREE_SIGNAL_DELAY_MS }))
    : visibleSignals;
  const lockedCount = isFree ? Math.max(0, qualityFiltered.length - FREE_SIGNAL_LIMIT) : 0;

  const todayUsed = user.freeSignalsViewedToday;
  const limitReached = isFree && user.lastSignalViewDate === new Date().toISOString().split("T")[0] && todayUsed >= 2;

  const DIRECTION_FILTERS: { key: FilterKey; label: string }[] = [
    { key: "ALL", label: t.signals.filters.all },
    { key: "ACTIVE", label: t.signals.filters.active },
    { key: "LONG", label: t.signals.filters.long },
    { key: "SHORT", label: t.signals.filters.short },
    { key: "CLOSED", label: t.signals.filters.closed },
  ];

  const QUALITY_FILTERS: { key: SignalQualityFilter; label: string; minScore: number }[] = [
    { key: "ALL", label: t.signals.quality.all, minScore: 0 },
    { key: "GOOD", label: t.signals.quality.good, minScore: 70 },
    { key: "HIGH", label: t.signals.quality.high, minScore: 80 },
    { key: "ELITE", label: t.signals.quality.elite, minScore: 90 },
  ];

  const qualityColor = (q: SignalQualityFilter) => {
    if (q === "ELITE") return colors.red;
    if (q === "HIGH") return colors.orange;
    if (q === "GOOD") return colors.gold;
    return colors.primary;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerArea, { paddingTop: topPad + 16, backgroundColor: colors.headerBg }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t.signals.title}</Text>
          <View style={styles.headerRight}>
            <View style={[styles.winBadge, { backgroundColor: colors.green + "20" }]}>
              <MaterialCommunityIcons name="target" size={13} color={colors.green} />
              <Text style={[styles.winBadgeText, { color: colors.green }]}>
                {market.winRate}% {t.signals.accuracy}
              </Text>
            </View>
            {isFree && (
              <View style={[styles.vipTag, { backgroundColor: colors.gold + "20", borderColor: colors.gold + "44" }]}>
                <Feather name="lock" size={11} color={colors.gold} />
                <Text style={[styles.vipTagText, { color: colors.gold }]}>VIP</Text>
              </View>
            )}
          </View>
        </View>

        {eliteSignalCount > 0 && (
          <Animated.View
            style={[
              styles.eliteAlert,
              { backgroundColor: colors.gold + "18", borderColor: colors.gold + "55", opacity: elitePulse },
            ]}
          >
            <MaterialCommunityIcons name="crown" size={14} color={colors.gold} />
            <Text style={[styles.eliteAlertText, { color: colors.gold }]}>
              {t.signals.eliteAlert} — {eliteSignalCount}
            </Text>
            <View style={[styles.eliteDot, { backgroundColor: colors.gold }]} />
          </Animated.View>
        )}

        {isFree && (
          <View style={[styles.freeBanner, { backgroundColor: colors.gold + "12", borderColor: colors.gold + "30" }]}>
            <Feather name="info" size={13} color={colors.gold} />
            <Text style={[styles.freeBannerText, { color: colors.gold }]}>
              {t.signals.freeBanner}
            </Text>
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {DIRECTION_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, {
                  backgroundColor: isActive ? colors.primary : colors.secondary,
                  borderColor: isActive ? colors.primary : colors.border,
                }]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterBtnText, { color: isActive ? colors.primaryForeground : colors.textMuted }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.qualityRow}>
          <Text style={[styles.qualityLabel, { color: colors.textMuted }]}>{t.signals.quality.label}:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qualityFilters}>
            {QUALITY_FILTERS.map((q) => {
              const isActive = qualityFilter === q.key;
              const qColor = qualityColor(q.key);
              return (
                <TouchableOpacity
                  key={q.key}
                  style={[
                    styles.qualityBtn,
                    {
                      backgroundColor: isActive ? qColor + "22" : "transparent",
                      borderColor: isActive ? qColor + "88" : colors.border,
                    },
                  ]}
                  onPress={() => setSignalQualityFilter(q.key)}
                  activeOpacity={0.7}
                >
                  {q.key === "ELITE" && (
                    <MaterialCommunityIcons name="crown" size={10} color={isActive ? qColor : colors.textMuted} />
                  )}
                  <Text style={[styles.qualityBtnText, { color: isActive ? qColor : colors.textMuted }]}>
                    {q.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {qualityFiltered.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.cardBorder }]}>
            <MaterialCommunityIcons name="radar" size={44} color={colors.textDim} />
            <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>{t.signals.noSignals}</Text>
            <Text style={[styles.emptySub, { color: colors.textDim }]}>{t.signals.noSignalsSub}</Text>
          </View>
        ) : (
          <>
            {limitReached && isFree && (
              <View style={[styles.limitBanner, { backgroundColor: colors.red + "12", borderColor: colors.red + "30" }]}>
                <Feather name="clock" size={14} color={colors.red} />
                <Text style={[styles.limitText, { color: colors.red }]}>{t.signals.limitReached}</Text>
              </View>
            )}

            {delayedSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} locked={false} />
            ))}

            {lockedCount > 0 && (
              <>
                {Array.from({ length: Math.min(lockedCount, 3) }).map((_, i) => (
                  <SignalCard key={`locked-${i}`} signal={qualityFiltered[FREE_SIGNAL_LIMIT + i]} locked={true} />
                ))}
                {lockedCount > 3 && (
                  <View style={[styles.moreLockedCard, { backgroundColor: colors.card, borderColor: colors.gold + "33" }]}>
                    <Feather name="lock" size={18} color={colors.gold} />
                    <Text style={[styles.moreLockedText, { color: colors.gold }]}>
                      +{lockedCount - 3} {t.signals.vipExclusive}
                    </Text>
                    <Text style={[styles.moreLockedSub, { color: colors.textMuted }]}>
                      {t.signals.vipExclusiveSub}
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 16, paddingBottom: 10 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  winBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  winBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  vipTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  vipTagText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  eliteAlert: { flexDirection: "row", alignItems: "center", gap: 7, padding: 9, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  eliteAlertText: { fontSize: 12, fontFamily: "Inter_700Bold", flex: 1 },
  eliteDot: { width: 7, height: 7, borderRadius: 3.5 },
  freeBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  freeBannerText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  filtersRow: { paddingBottom: 8, gap: 8 },
  filterBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  qualityRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, marginBottom: 2 },
  qualityLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", flexShrink: 0 },
  qualityFilters: { gap: 6, paddingVertical: 2 },
  qualityBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  qualityBtnText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 110 },
  emptyBox: { alignItems: "center", padding: 52, gap: 12, borderRadius: 16, borderWidth: 1, borderStyle: "dashed" },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  limitBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  limitText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 19 },
  moreLockedCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginBottom: 14 },
  moreLockedText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  moreLockedSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
