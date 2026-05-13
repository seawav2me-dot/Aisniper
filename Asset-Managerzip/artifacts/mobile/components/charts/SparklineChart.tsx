import React from "react";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from "react-native-svg";

interface SparklineChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
  filled?: boolean;
}

function buildPath(data: number[], w: number, h: number): string {
  if (data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp1x = (points[i - 1].x + points[i].x) / 2;
    const cp1y = points[i - 1].y;
    const cp2x = (points[i - 1].x + points[i].x) / 2;
    const cp2y = points[i].y;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${points[i].x},${points[i].y}`;
  }
  return d;
}

export function SparklineChart({ data, width, height, color, filled = true }: SparklineChartProps) {
  if (!data || data.length < 2) return null;

  const linePath = buildPath(data, width, height);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const lastY = height - pad - ((data[data.length - 1] - min) / range) * (height - pad * 2);

  const fillPath = linePath + ` L ${width},${height} L 0,${height} Z`;

  const gradId = `grad_${color.replace("#", "")}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </LinearGradient>
      </Defs>
      {filled && (
        <Path d={fillPath} fill={`url(#${gradId})`} />
      )}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
