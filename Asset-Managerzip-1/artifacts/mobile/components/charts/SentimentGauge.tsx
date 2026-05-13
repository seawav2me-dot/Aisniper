import React from "react";
import Svg, { Circle, Line, Text as SvgText, Path } from "react-native-svg";

const CX = 50;
const CY = 66;
const R = 38;
const HALF_CIRC = Math.PI * R;
const FULL_CIRC = 2 * Math.PI * R;

function getSentimentColor(value: number): string {
  if (value < 20) return "#ef4444";
  if (value < 40) return "#f97316";
  if (value < 60) return "#eab308";
  if (value < 80) return "#84cc16";
  return "#22c55e";
}

interface SentimentGaugeProps {
  value: number;
  label: string;
  size?: number;
}

export function SentimentGauge({ value, label, size = 120 }: SentimentGaugeProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const fillLength = (clampedValue / 100) * HALF_CIRC;
  const color = getSentimentColor(clampedValue);

  const angleDeg = 180 - (clampedValue / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const needleLength = R - 6;
  const nx = CX + needleLength * Math.cos(angleRad);
  const ny = CY - needleLength * Math.sin(angleRad);

  const scale = size / 100;

  return (
    <Svg width={size} height={size * 0.72} viewBox={`0 0 100 72`}>
      <Circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={10}
        strokeDasharray={`${HALF_CIRC} ${FULL_CIRC}`}
        transform={`rotate(180, ${CX}, ${CY})`}
      />
      <Circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${fillLength} ${FULL_CIRC}`}
        transform={`rotate(180, ${CX}, ${CY})`}
      />
      <Line
        x1={CX}
        y1={CY}
        x2={nx}
        y2={ny}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Circle cx={CX} cy={CY} r={4} fill={color} />
      <Circle cx={CX} cy={CY} r={2} fill="#0a0d14" />
      <SvgText
        x={CX}
        y={CY - R - 4}
        textAnchor="middle"
        fill={color}
        fontSize={16}
        fontWeight="bold"
      >
        {clampedValue}
      </SvgText>
      <SvgText
        x={CX}
        y={CY - R + 10}
        textAnchor="middle"
        fill="rgba(255,255,255,0.45)"
        fontSize={8}
      >
        {label}
      </SvgText>
      <SvgText
        x={12}
        y={CY + 8}
        textAnchor="middle"
        fill="rgba(239,68,68,0.7)"
        fontSize={7}
      >
        FEAR
      </SvgText>
      <SvgText
        x={88}
        y={CY + 8}
        textAnchor="middle"
        fill="rgba(34,197,94,0.7)"
        fontSize={7}
      >
        GREED
      </SvgText>
    </Svg>
  );
}
