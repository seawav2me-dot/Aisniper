import React from "react";
import Svg, { Circle, Text as SvgText } from "react-native-svg";

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const TRACK_ARC_DEG = 260;
const TRACK_LENGTH = (TRACK_ARC_DEG / 360) * CIRCUMFERENCE;

interface ScoreRingProps {
  score: number;
  color: string;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, color, size = 90, label }: ScoreRingProps) {
  const fillLength = (score / 100) * TRACK_LENGTH;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle
        cx={50}
        cy={50}
        r={RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${TRACK_LENGTH} ${CIRCUMFERENCE}`}
        transform="rotate(135, 50, 50)"
      />
      <Circle
        cx={50}
        cy={50}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${fillLength} ${CIRCUMFERENCE}`}
        transform="rotate(135, 50, 50)"
      />
      <SvgText
        x={50}
        y={47}
        textAnchor="middle"
        fill={color}
        fontSize={22}
        fontWeight="bold"
      >
        {score}
      </SvgText>
      <SvgText
        x={50}
        y={61}
        textAnchor="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize={11}
      >
        {label ?? "/100"}
      </SvgText>
    </Svg>
  );
}
