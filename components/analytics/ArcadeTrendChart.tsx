import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  Circle,
} from "react-native-svg";

export type TrendPoint = {
  label: string;
  value: number;
};

type Props = {
  data: TrendPoint[];
  height?: number;
  color?: string;
  unit?: string;
  emptyMessage?: string;
};

export default function ArcadeTrendChart({
  data,
  height = 140,
  color = Colors.accent,
  unit = "%",
  emptyMessage = "No trend data available yet",
}: Props) {
  if (data.length < 2) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const chartPaddingTop = 20;
  const chartPaddingBottom = 30;
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;
  const chartWidth = 300; // Will be scaled by viewBox

  // Generate SVG path coordinates
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (chartWidth - 40) + 20;
    const norm = (d.value - minVal) / range;
    const y = chartPaddingTop + (1 - norm) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    height - chartPaddingBottom
  } L ${points[0].x} ${height - chartPaddingBottom} Z`;

  return (
    <View style={styles.container}>
      <View style={{ width: "100%", height }}>
        <Svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
        >
          <Defs>
            <LinearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Area fill */}
          <Path d={areaD} fill="url(#trendGrad)" />

          {/* Line stroke */}
          <Path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={Colors.bg}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>
      </View>

      {/* X-Axis Labels */}
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={styles.axisLabel} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginTop: -10,
  },
  axisLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
  emptyContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
});

