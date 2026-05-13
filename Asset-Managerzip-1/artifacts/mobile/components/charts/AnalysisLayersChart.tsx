import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface AnalysisLayer {
  name: string;
  value: number;
  bullish: boolean;
}

interface AnalysisLayersChartProps {
  layers: AnalysisLayer[];
}

function LayerBar({ layer, index }: { layer: AnalysisLayer; index: number }) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  const color = layer.bullish ? colors.green : colors.red;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: layer.value,
      duration: 600 + index * 80,
      useNativeDriver: false,
    }).start();
  }, [layer.value]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={1}>
        {layer.name}
      </Text>
      <View style={[styles.barBg, { backgroundColor: colors.secondary }]}>
        <Animated.View
          style={[
            styles.barFill,
            { width, backgroundColor: color + "cc" },
          ]}
        />
        <View
          style={[
            styles.barFillGlow,
            { width: `${layer.value}%`, backgroundColor: color + "22" },
          ]}
        />
      </View>
      <Text style={[styles.value, { color }]}>{layer.value}%</Text>
    </View>
  );
}

export function AnalysisLayersChart({ layers }: AnalysisLayersChartProps) {
  return (
    <View style={styles.container}>
      {layers.map((layer, i) => (
        <LayerBar key={layer.name} layer={layer} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { width: 100, fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "right" },
  barBg: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden", position: "relative" },
  barFill: { height: "100%", borderRadius: 4, position: "absolute", left: 0, top: 0 },
  barFillGlow: { height: "100%", borderRadius: 4, position: "absolute", left: 0, top: 0 },
  value: { width: 36, fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "left" },
});
