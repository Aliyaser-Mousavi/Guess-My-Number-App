import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { StyleSheet, Text, View } from "react-native";

export type BarChartItem = {
  label: string;
  value: number;
  highlight?: boolean;
  color?: string;
  subLabel?: string;
};

type Props = {
  data: BarChartItem[];
  height?: number;
  emptyMessage?: string;
  unit?: string;
};

export default function ArcadeBarChart({
  data,
  height = 140,
  emptyMessage = "No activity recorded yet",
  unit = "",
}: Props) {
  const maxValue = Math.max(...data.map((d) => d.value), 0);

  if (maxValue === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {/* Subtle grid background line */}
        <View style={styles.gridLineTop} />
        <View style={styles.gridLineMid} />

        <View style={styles.barsRow}>
          {data.map((item, idx) => {
            const ratio = maxValue > 0 ? item.value / maxValue : 0;
            const barHeight = Math.max(
              ratio * (height - 36),
              item.value > 0 ? 6 : 2,
            );
            const barColor =
              item.color ?? (item.highlight ? Colors.accent : Colors.primary);

            return (
              <View key={`${item.label}-${idx}`} style={styles.barColumn}>
                <Text style={styles.barValue} numberOfLines={1}>
                  {item.value > 0 ? `${item.value}${unit}` : ""}
                </Text>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                        shadowColor: barColor,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.barLabel,
                    item.highlight && styles.barLabelHighlight,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  chartArea: {
    width: "100%",
    justifyContent: "flex-end",
    position: "relative",
  },
  gridLineTop: {
    position: "absolute",
    top: 14,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  gridLineMid: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  barsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    marginHorizontal: 3,
  },
  barTrack: {
    width: "100%",
    maxWidth: 24,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderRadius: Radius.xs,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  barValue: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  barLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: "center",
  },
  barLabelHighlight: {
    color: Colors.accent,
    fontFamily: FontFamily.sansBold,
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
