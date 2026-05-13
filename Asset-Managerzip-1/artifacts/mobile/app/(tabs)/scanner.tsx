import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useT } from "@/hooks/useT";
import { CoinRow } from "@/components/CoinRow";
import { AnalysisLayersChart, AnalysisLayer } from "@/components/charts/AnalysisLayersChart";

type TimeFrame = "15M" | "1H" | "4H" | "1D";

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { hotCoins, market } = useApp();
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState<TimeFrame>("1H");
  const [lastScan, setLastScan] = useState<Date>(new Date());
  const [layerValues, setLayerValues] = useState<number[]>([82, 75, 68, 71, 64, 55, 59]);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const TIME_FRAMES: { key: TimeFrame; label: string }[] = [
    { key: "15M", label: t.scanner.timeframes["15M"] },
    { key: "1H", label: t.scanner.timeframes["1H"] },
    { key: "4H", label: t.scanner.timeframes["4H"] },
    { key: "1D", label: "1D" },
  ];

  const analysisLayers: AnalysisLayer[] = t.scanner.analysisLayers.map((name, i) => ({
    name,
    value: layerValues[i] ?? 60,
    bullish: layerValues[i] >= 60,
  }));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const startScan = () => {
    setIsScanning(true);
    setScanDone(false);
    scanAnim.setValue(0);
    radarAnim.setValue(0);
    Animated.parallel([
      Animated.timing(scanAnim, { toValue: 1, duration: 3500, useNativeDriver: false }),
      Animated.loop(Animated.timing(radarAnim, { toValue: 1, duration: 800, useNativeDriver: true }), { iterations: 4 }),
    ]).start(() => {
      setIsScanning(false);
      setScanDone(true);
      setLastScan(new Date());
      setLayerValues(analysisLayers.map(() => Math.floor(50 + Math.random() * 45)));
    });
  };

  const scanBarWidth = scanAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const radarRotate = radarAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const sortedCoins = [...hotCoins].sort((a, b) => b.aiScore - a.aiScore);
  const bullishCoins = sortedCoins.filter((c) => c.trend === "BULLISH");
  const bearishCoins = sortedCoins.filter((c) => c.trend === "BEARISH");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.headerBg }]}>
        <View style={styles.topBarRow}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t.scanner.title}</Text>
          <View style={[styles.modeBadge, { backgroundColor: colors.primary + "18" }]}>
            <MaterialCommunityIcons name="brain" size={13} color={colors.primary} />
            <Text style={[styles.modeBadgeText, { color: colors.primary }]}>
              {market.aiMode === "ACTIVE" ? t.scanner.aiActive : t.scanner.aiScanning}
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tfRow}>
          {TIME_FRAMES.map((tf) => (
            <TouchableOpacity
              key={tf.key}
              style={[styles.tfBtn, {
                backgroundColor: activeTimeframe === tf.key ? colors.primary : colors.secondary,
                borderColor: activeTimeframe === tf.key ? colors.primary : colors.border,
              }]}
              onPress={() => setActiveTimeframe(tf.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tfBtnText, { color: activeTimeframe === tf.key ? colors.primaryForeground : colors.textMuted }]}>
                {tf.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.scanCard, { backgroundColor: colors.card, borderColor: isScanning ? colors.primary + "66" : colors.cardBorder }]}>
          <View style={styles.scanTop}>
            <View style={styles.radarWrap}>
              <View style={[styles.radarOuter, { borderColor: colors.primary + "30" }]}>
                <View style={[styles.radarInner, { borderColor: colors.primary + "55" }]}>
                  <Animated.View style={{ transform: [{ rotate: radarRotate }] }}>
                    <MaterialCommunityIcons name="radar" size={38} color={isScanning ? colors.primary : colors.textDim} />
                  </Animated.View>
                </View>
              </View>
              {isScanning && (
                <Animated.View style={[styles.radarPulse, { borderColor: colors.primary, opacity: pulseAnim }]} />
              )}
            </View>
            <View style={styles.scanInfo}>
              <Text style={[styles.scanTitle, { color: colors.text }]}>
                {isScanning ? t.scanner.scanning : t.scanner.complete}
              </Text>
              <Text style={[styles.scanSub, { color: colors.textMuted }]}>
                {isScanning
                  ? t.scanner.analyzing
                  : `${t.scanner.lastScan} ${lastScan.toLocaleTimeString()}`}
              </Text>
              <View style={styles.scanMeta}>
                {[
                  { label: t.scanner.pairs, val: "142" },
                  { label: t.scanner.layers, val: "7" },
                  { label: t.scanner.frames, val: "3" },
                ].map((m) => (
                  <View key={m.label} style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{m.label}</Text>
                    <Text style={[styles.metaVal, { color: colors.text }]}>{m.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {isScanning && (
            <View style={[styles.scanBarBg, { backgroundColor: colors.secondary }]}>
              <Animated.View style={[styles.scanBarFill, { width: scanBarWidth, backgroundColor: colors.primary }]} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.scanBtn, { backgroundColor: isScanning ? colors.secondary : colors.primary, opacity: isScanning ? 0.6 : 1 }]}
            onPress={startScan}
            disabled={isScanning}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={isScanning ? "loading" : "magnify-scan"}
              size={18}
              color={isScanning ? colors.textMuted : colors.primaryForeground}
            />
            <Text style={[styles.scanBtnText, { color: isScanning ? colors.textMuted : colors.primaryForeground }]}>
              {isScanning ? t.scanner.scanning : t.scanner.startScan}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.layersCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.layersTitle, { color: colors.textMuted }]}>{t.scanner.activeLayersTitle}</Text>
          <AnalysisLayersChart layers={analysisLayers} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Feather name="trending-up" size={14} color={colors.green} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.scanner.bullish}</Text>
            <View style={[styles.countTag, { backgroundColor: colors.green + "20" }]}>
              <Text style={[styles.countTagText, { color: colors.green }]}>{bullishCoins.length}</Text>
            </View>
          </View>
          {bullishCoins.map((coin, i) => <CoinRow key={coin.symbol} coin={coin} rank={i + 1} />)}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Feather name="trending-down" size={14} color={colors.red} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.scanner.bearish}</Text>
            <View style={[styles.countTag, { backgroundColor: colors.red + "20" }]}>
              <Text style={[styles.countTagText, { color: colors.red }]}>{bearishCoins.length}</Text>
            </View>
          </View>
          {bearishCoins.map((coin, i) => <CoinRow key={coin.symbol} coin={coin} rank={i + 1} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 14 },
  topBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  pageTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  modeBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modeBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  tfRow: { gap: 8 },
  tfBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tfBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 16 },
  scanCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  scanTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  radarWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  radarOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  radarInner: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  radarPulse: { position: "absolute", width: 94, height: 94, borderRadius: 47, borderWidth: 1 },
  scanInfo: { flex: 1, gap: 6 },
  scanTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scanSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  scanMeta: { flexDirection: "row", gap: 8, marginTop: 4 },
  metaChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignItems: "center", gap: 2 },
  metaLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  metaVal: { fontSize: 14, fontFamily: "Inter_700Bold" },
  scanBarBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  scanBarFill: { height: "100%", borderRadius: 3 },
  scanBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, borderRadius: 12 },
  scanBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  layersCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  layersTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  section: { gap: 10 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  countTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countTagText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
