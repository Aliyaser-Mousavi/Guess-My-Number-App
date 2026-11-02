import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function RangeBar({
  min,
  max,
  low,
  high,
}: {
  min: number;
  max: number;
  low: number;
  high: number;
}) {
  const span = Math.max(1, max - min);
  const clampedLow = Math.max(min, Math.min(low, max));
  const clampedHigh = Math.max(clampedLow, Math.min(high, max));

  const left = Math.min(100, Math.max(0, ((clampedLow - min) / span) * 100));
  const rawWidth = ((clampedHigh - clampedLow) / span) * 100;
  const width = Math.min(100 - left, Math.max(rawWidth, 3));

  const displayHigh = Math.max(clampedLow, high > clampedLow ? high - 1 : high);

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <View style={styles.boundBox}>
          <Text style={styles.boundText}>{clampedLow}</Text>
        </View>
        <Text style={styles.midLabel}>SEARCH RANGE</Text>
        <View style={styles.boundBox}>
          <Text style={styles.boundText}>{displayHigh}</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              left: `${left}%`,
              width: `${width}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginVertical: 10,
    paddingHorizontal: 2,
  },
  labels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  boundBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  boundText: {
    fontFamily: FontFamily.display,
    color: Colors.accent,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  midLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
