import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { UserTier, SubscriptionPrices, Language } from "@/context/AppContext";
import { useT } from "@/hooks/useT";

interface BotConfig {
  walletAddress: string;
  botUsername: string;
  paymentMethods: string[];
}

interface PerformanceStat {
  period: string;
  label: string;
  totalSignals: number;
  wins: number;
  losses: number;
  winRate: number;
  profitOn100: number;
}

function usePerformance() {
  const [stats, setStats] = useState<PerformanceStat[]>([]);
  useEffect(() => {
    const base = (process.env["EXPO_PUBLIC_API_URL"] as string | undefined) ?? "";
    if (!base) return;
    fetch(`${base}/api/performance?limit=3`)
      .then((r) => r.json() as Promise<{ ok: boolean; stats: PerformanceStat[] }>)
      .then((d) => { if (d.ok && d.stats?.length) setStats(d.stats); })
      .catch(() => {});
  }, []);
  return stats;
}

function useBotConfig() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  useEffect(() => {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    const base = domain ? `https://${domain}` : "";
    fetch(`${base}/api/config`)
      .then((r) => r.json())
      .then((d) => setConfig(d as BotConfig))
      .catch(() => {});
  }, []);
  return config;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, upgradeUser, subscriptionPrices, updateSubscriptionPrices, setLanguage } = useApp();
  const t = useT();
  const config = useBotConfig();
  const perfStats = usePerformance();

  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [editPrices, setEditPrices] = useState<SubscriptionPrices>({ ...subscriptionPrices });
  const adminTapCount = useRef(0);
  const adminTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const handleTitleTap = () => {
    adminTapCount.current += 1;
    if (adminTapTimer.current) clearTimeout(adminTapTimer.current);
    adminTapTimer.current = setTimeout(() => { adminTapCount.current = 0; }, 2000);
    if (adminTapCount.current >= 5) {
      adminTapCount.current = 0;
      setAdminMode((prev) => !prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyReferral = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(user.referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  const handleCopyWallet = async () => {
    if (!config?.walletAddress) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(config.walletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const handleUpgrade = (tier: UserTier, planLabel: string, price: number) => {
    if (tier === user.tier) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wallet = config?.walletAddress ?? "تواصل مع الدعم";
    Alert.alert(
      `الترقية إلى ${planLabel}`,
      `أرسل ${price} USDT (TRC20/BEP20) إلى:\n\n${wallet}\n\nبعد الدفع أرسل لقطة الشاشة إلى @${config?.botUsername ?? "support"}`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "تم الدفع", onPress: () => upgradeUser(tier) },
      ]
    );
  };

  const handleSavePrices = () => {
    updateSubscriptionPrices(editPrices);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم الحفظ", "تم تحديث أسعار الاشتراك بنجاح");
  };

  const tierColor = user.tier === "ELITE" ? colors.gold : user.tier === "VIP" ? colors.primary : colors.textMuted;
  const tierLabel = user.tier === "ELITE" ? "ELITE" : user.tier === "VIP" ? "VIP" : "مجاني";
  const xpProgress = Math.min((user.xp / 100) * 100, 100);

  const PLANS: { tier: UserTier; label: string; price: number; period: string; color: string; features: string[]; popular?: boolean }[] = [
    {
      tier: "FREE",
      label: "مجاني",
      price: 0,
      period: "",
      color: colors.textMuted,
      features: ["إشارتان يومياً", "تأخير 30 دقيقة", "بيانات السوق الأساسية", "معاينة نقاط الدخول"],
    },
    {
      tier: "VIP",
      label: "VIP",
      price: subscriptionPrices.vipMonthly,
      period: "شهرياً",
      color: colors.primary,
      popular: true,
      features: [
        "جميع الإشارات فوراً",
        "إشارات Elite Sniper",
        "تتبع الحيتان",
        "AI Scanner كامل",
        "تنبيهات مبكرة",
        "جميع الأطر الزمنية",
        "تداول وهمي متقدم",
      ],
    },
    {
      tier: "ELITE",
      label: "ELITE",
      price: subscriptionPrices.eliteMonthly,
      period: "شهرياً",
      color: colors.gold,
      features: [
        "كل مزايا VIP",
        "محفظة AI (قريباً)",
        "نسخ التداول (قريباً)",
        "مجموعة إشارات خاصة",
        "دعم أولوية 24/7",
        "تقارير تحليل أسبوعية",
      ],
    },
  ];

  const currentTierIndex = PLANS.findIndex((p) => p.tier === user.tier);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 12, backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>حسابي</Text>
        </TouchableOpacity>
        {adminMode && (
          <View style={[styles.adminBadge, { backgroundColor: colors.red + "22", borderColor: colors.red + "44" }]}>
            <MaterialCommunityIcons name="shield-crown" size={12} color={colors.red} />
            <Text style={[styles.adminBadgeText, { color: colors.red }]}>وضع الأدمن</Text>
          </View>
        )}
        {config?.botUsername && (
          <View style={[styles.botTag, { backgroundColor: colors.primary + "18" }]}>
            <MaterialCommunityIcons name="robot" size={12} color={colors.primary} />
            <Text style={[styles.botTagText, { color: colors.primary }]}>@{config.botUsername}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: tierColor + "44" }]}>
          <View style={[styles.avatarRing, { borderColor: tierColor + "88" }]}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              <MaterialCommunityIcons
                name={user.tier === "ELITE" ? "crown" : user.tier === "VIP" ? "trophy" : "account"}
                size={30}
                color={tierColor}
              />
            </View>
          </View>
          <View style={styles.profileRight}>
            <View style={styles.rankRow}>
              <Text style={[styles.rankName, { color: colors.text }]}>{user.rank}</Text>
              <View style={[styles.tierTag, { backgroundColor: tierColor + "20", borderColor: tierColor + "44" }]}>
                <Text style={[styles.tierTagText, { color: tierColor }]}>{tierLabel}</Text>
              </View>
            </View>
            <View style={styles.levelStreakRow}>
              <Text style={[styles.levelVal, { color: colors.textMuted }]}>
                المستوى <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>{user.level}</Text>
              </Text>
              <View style={[styles.streakChip, { backgroundColor: colors.gold + "18" }]}>
                <Feather name="zap" size={11} color={colors.gold} />
                <Text style={[styles.streakChipText, { color: colors.gold }]}>{user.streak} يوم</Text>
              </View>
            </View>
            <View style={[styles.xpBarBg, { backgroundColor: colors.secondary }]}>
              <View style={[styles.xpBarFill, { width: `${xpProgress}%` as any, backgroundColor: tierColor }]} />
            </View>
            <Text style={[styles.xpLabel, { color: colors.textMuted }]}>{user.xp} XP</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.green }]}>89.3%</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>نسبة النجاح</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.blue }]}>{user.referralCount}</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>الإحالات</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.gold }]}>+3.8%</Text>
            <Text style={[styles.statLbl, { color: colors.textMuted }]}>متوسط الربح</Text>
          </View>
        </View>

        {config?.botUsername && (
          <TouchableOpacity
            style={[styles.botBtn, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "44" }]}
            onPress={() => Linking.openURL(`https://t.me/${config.botUsername}`)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="robot" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.botBtnTitle, { color: colors.text }]}>فتح البوت على تيليغرام</Text>
              <Text style={[styles.botBtnSub, { color: colors.textMuted }]}>@{config.botUsername}</Text>
            </View>
            <MaterialCommunityIcons name="open-in-new" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {perfStats.length > 0 && (
          <View style={[styles.perfCard, { backgroundColor: colors.card, borderColor: colors.green + "44" }]}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="chart-line" size={15} color={colors.green} />
              <Text style={[styles.cardTitleText, { color: colors.text }]}>سجل الأداء</Text>
              <View style={[styles.usdtTag, { backgroundColor: colors.green + "20" }]}>
                <Text style={[styles.usdtTagText, { color: colors.green }]}>LIVE</Text>
              </View>
            </View>
            {perfStats.map((s, idx) => (
              <View key={s.period} style={[styles.perfRow, { borderBottomColor: colors.border, borderBottomWidth: idx < perfStats.length - 1 ? 1 : 0 }]}>
                <Text style={[styles.perfPeriod, { color: colors.textMuted }]}>{s.label}</Text>
                <View style={styles.perfStats}>
                  <Text style={[styles.perfVal, { color: colors.text }]}>{s.totalSignals} صفقة</Text>
                  <Text style={[styles.perfWin, { color: colors.green }]}>{s.winRate}%</Text>
                  <Text style={[styles.perfProfit, { color: colors.gold }]}>+${s.profitOn100}</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.perfNote, { color: colors.textMuted }]}>* الربح محسوب على $100 لكل صفقة</Text>
          </View>
        )}

        <View style={[styles.referralCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardTitleRow}>
            <Feather name="users" size={15} color={colors.primary} />
            <Text style={[styles.cardTitleText, { color: colors.text }]}>برنامج الإحالة</Text>
          </View>
          <Text style={[styles.referralNote, { color: colors.textMuted }]}>
            ادعُ 3 أصدقاء وأحصل على أسبوع VIP مجاناً — 10 أصدقاء = ترقية Elite
          </Text>
          <TouchableOpacity
            style={[styles.codeRow, {
              backgroundColor: copiedReferral ? colors.primary + "18" : colors.secondary,
              borderColor: copiedReferral ? colors.primary + "44" : colors.border,
            }]}
            onPress={handleCopyReferral}
            activeOpacity={0.8}
          >
            <Text style={[styles.codeText, { color: copiedReferral ? colors.primary : colors.text }]}>{user.referralCode}</Text>
            <Feather name={copiedReferral ? "check" : "copy"} size={16} color={copiedReferral ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {adminMode && (
          <View style={[styles.adminPanel, { backgroundColor: colors.card, borderColor: colors.red + "44" }]}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="shield-crown" size={15} color={colors.red} />
              <Text style={[styles.cardTitleText, { color: colors.red }]}>إعدادات الأدمن — أسعار الاشتراك</Text>
            </View>

            {[
              { key: "vipMonthly" as keyof SubscriptionPrices, label: "VIP شهري ($)" },
              { key: "vipQuarterly" as keyof SubscriptionPrices, label: "VIP ربع سنوي ($)" },
              { key: "vipAnnual" as keyof SubscriptionPrices, label: "VIP سنوي ($)" },
              { key: "eliteMonthly" as keyof SubscriptionPrices, label: "Elite شهري ($)" },
              { key: "eliteAnnual" as keyof SubscriptionPrices, label: "Elite سنوي ($)" },
            ].map((field) => (
              <View key={field.key} style={styles.adminField}>
                <Text style={[styles.adminFieldLabel, { color: colors.textMuted }]}>{field.label}</Text>
                <TextInput
                  style={[styles.adminInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
                  value={String(editPrices[field.key])}
                  onChangeText={(v) => setEditPrices((prev) => ({ ...prev, [field.key]: parseFloat(v) || 0 }))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.red }]}
              onPress={handleSavePrices}
              activeOpacity={0.8}
            >
              <Feather name="save" size={15} color="#fff" />
              <Text style={styles.saveBtnText}>حفظ الأسعار</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>خطط الاشتراك</Text>

        {PLANS.map((plan, idx) => {
          const isCurrentPlan = user.tier === plan.tier;
          const isBetter = currentTierIndex < idx;
          return (
            <View key={plan.tier} style={[styles.planCard, {
              backgroundColor: colors.card,
              borderColor: isCurrentPlan ? plan.color + "66" : colors.cardBorder,
              borderWidth: isCurrentPlan ? 2 : 1,
            }]}>
              {plan.popular && !isCurrentPlan && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={[styles.popularText, { color: colors.primaryForeground }]}>الأكثر شعبية</Text>
                </View>
              )}
              {isCurrentPlan && (
                <View style={[styles.currentBadge, { backgroundColor: plan.color + "22" }]}>
                  <Text style={[styles.currentBadgeText, { color: plan.color }]}>خطتك الحالية</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: plan.color }]}>{plan.label}</Text>
                <View style={styles.planPriceCol}>
                  {plan.price > 0 ? (
                    <>
                      <Text style={[styles.planPrice, { color: colors.text }]}>${plan.price}</Text>
                      <Text style={[styles.planPeriod, { color: colors.textMuted }]}>{plan.period}</Text>
                    </>
                  ) : (
                    <Text style={[styles.planPrice, { color: colors.textMuted }]}>مجاني</Text>
                  )}
                </View>
              </View>
              {plan.tier === "VIP" && plan.price > 0 && (
                <View style={styles.extraPricesRow}>
                  <View style={[styles.extraPrice, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.extraPriceLabel, { color: colors.textMuted }]}>ربع سنوي</Text>
                    <Text style={[styles.extraPriceVal, { color: plan.color }]}>${subscriptionPrices.vipQuarterly}</Text>
                  </View>
                  <View style={[styles.extraPrice, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.extraPriceLabel, { color: colors.textMuted }]}>سنوي</Text>
                    <Text style={[styles.extraPriceVal, { color: plan.color }]}>${subscriptionPrices.vipAnnual}</Text>
                  </View>
                </View>
              )}
              <View style={styles.featuresList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Feather name="check" size={13} color={plan.color} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{f}</Text>
                  </View>
                ))}
              </View>
              {plan.tier !== "FREE" && isBetter && (
                <TouchableOpacity
                  style={[styles.upgradeBtn, { backgroundColor: plan.color }]}
                  onPress={() => handleUpgrade(plan.tier, plan.label, plan.price)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.upgradeBtnText, { color: "#0a0d14" }]}>اشترك الآن — {plan.label}</Text>
                  <Feather name="arrow-left" size={15} color="#0a0d14" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {config?.walletAddress ? (
          <View style={[styles.walletCard, { backgroundColor: colors.card, borderColor: colors.gold + "44" }]}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="wallet" size={15} color={colors.gold} />
              <Text style={[styles.cardTitleText, { color: colors.text }]}>محفظة الدفع</Text>
              <View style={[styles.usdtTag, { backgroundColor: colors.green + "20" }]}>
                <Text style={[styles.usdtTagText, { color: colors.green }]}>USDT</Text>
              </View>
            </View>
            <Text style={[styles.walletSub, { color: colors.textMuted }]}>أرسل USDT (TRC20 / BEP20) إلى هذا العنوان:</Text>
            <TouchableOpacity
              style={[styles.codeRow, {
                backgroundColor: copiedWallet ? colors.gold + "18" : colors.secondary,
                borderColor: copiedWallet ? colors.gold + "44" : colors.border,
              }]}
              onPress={handleCopyWallet}
              activeOpacity={0.8}
            >
              <Text style={[styles.walletAddr, { color: copiedWallet ? colors.gold : colors.text }]} numberOfLines={1} ellipsizeMode="middle">
                {config.walletAddress}
              </Text>
              <Feather name={copiedWallet ? "check" : "copy"} size={16} color={copiedWallet ? colors.gold : colors.textMuted} />
            </TouchableOpacity>
            <Text style={[styles.walletNote, { color: colors.textMuted }]}>
              بعد الدفع أرسل لقطة شاشة إلى @{config.botUsername}
            </Text>
          </View>
        ) : null}

        <View style={[styles.langCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardTitleRow}>
            <Feather name="globe" size={15} color={colors.primary} />
            <Text style={[styles.cardTitleText, { color: colors.text }]}>{t.profile.language}</Text>
          </View>
          <View style={styles.langRow}>
            {(["ar", "en"] as Language[]).map((lang) => {
              const isActive = (user.language ?? "ar") === lang;
              const label = lang === "ar" ? t.profile.languageAr : t.profile.languageEn;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.langBtn, {
                    backgroundColor: isActive ? colors.primary + "22" : colors.secondary,
                    borderColor: isActive ? colors.primary + "88" : colors.border,
                    flex: 1,
                  }]}
                  onPress={() => setLanguage(lang)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.langBtnText, { color: isActive ? colors.primary : colors.textMuted }]}>
                    {lang === "ar" ? "عربي" : "EN"} — {label}
                  </Text>
                  {isActive && <Feather name="check-circle" size={14} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.payCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.payTitle, { color: colors.textMuted }]}>{t.profile.acceptedPayments}</Text>
          <View style={styles.payList}>
            {(config?.paymentMethods ?? ["USDT TRC20", "USDT BEP20", "BTC", "ETH", "BNB"]).map((p) => (
              <View key={p} style={[styles.payChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="currency-usd" size={11} color={colors.primary} />
                <Text style={[styles.payChipText, { color: colors.text }]}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", flex: 1 },
  adminBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  adminBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  botTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  botTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  scroll: { padding: 16, gap: 14 },
  profileCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  profileRight: { flex: 1, gap: 6 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankName: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  tierTag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tierTagText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  levelStreakRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelVal: { fontSize: 13, fontFamily: "Inter_400Regular" },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  streakChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  xpBarBg: { height: 5, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statsCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLbl: { fontSize: 11, fontFamily: "Inter_500Medium" },
  statDivider: { width: 1, height: 40 },
  referralCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitleText: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  referralNote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  codeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, borderWidth: 1 },
  codeText: { fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  adminPanel: { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 12 },
  adminField: { gap: 4 },
  adminFieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  adminInput: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, fontSize: 16, fontFamily: "Inter_700Bold" },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, marginTop: 4 },
  planCard: { borderRadius: 16, padding: 16, gap: 14, overflow: "hidden" },
  popularBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  popularText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  currentBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  currentBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planPriceCol: { alignItems: "flex-end", gap: 2 },
  planPrice: { fontSize: 20, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  extraPricesRow: { flexDirection: "row", gap: 10 },
  extraPrice: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center", gap: 3 },
  extraPriceLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  extraPriceVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  featuresList: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  upgradeBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  walletCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  walletSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  walletAddr: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  walletNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  usdtTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  usdtTagText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  langCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  langRow: { flexDirection: "row", gap: 10 },
  langBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  langBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  payCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  payTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  payList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  payChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  payChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  botBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  botBtnTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  botBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  perfCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  perfRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  perfPeriod: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  perfStats: { flexDirection: "row", gap: 10, alignItems: "center" },
  perfVal: { fontSize: 12, fontFamily: "Inter_400Regular" },
  perfWin: { fontSize: 13, fontFamily: "Inter_700Bold" },
  perfProfit: { fontSize: 14, fontFamily: "Inter_700Bold" },
  perfNote: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2 },
});
