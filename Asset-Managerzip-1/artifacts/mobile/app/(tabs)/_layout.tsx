import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useT } from "@/hooks/useT";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { eliteSignalCount } = useApp();
  const t = useT();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.headerBg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 62,
          paddingBottom: isWeb ? 10 : insets.bottom > 0 ? insets.bottom : 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.headerBg }]} />
          ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          marginBottom: isWeb ? 6 : 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color }) => <Feather name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="signals"
        options={{
          title: t.tabs.signals,
          tabBarIcon: ({ color }) => <Feather name="zap" size={20} color={color} />,
          tabBarBadge: eliteSignalCount > 0 ? eliteSignalCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.gold,
            color: "#000",
            fontSize: 10,
            fontFamily: "Inter_700Bold",
            minWidth: 16,
            height: 16,
            lineHeight: 16,
          },
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: t.tabs.scanner,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="radar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="paper-trading"
        options={{
          title: t.tabs.paperTrading,
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-line" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.account,
          tabBarIcon: ({ color }) => <Feather name="user" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="performance"
        options={{
          title: "الأداء",
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="chart-bar" size={22} color={color} />,
        }}
      />
      <Tabs.Screen name="whale" options={{ href: null }} />
    </Tabs>
  );
}
