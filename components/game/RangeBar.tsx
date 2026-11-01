import Colors from "@/constants/colors";
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
  const left = ((low - min) / span) * 100;
  const width = ((high - low) / span) * 100;

  return (
    <View style={styles.wrap}>
      <View style={styles.labels}>
        <Text style={styles.label}>{low}</Text>
        <Text style={styles.mid}>Search range</Text>
        <Text style={styles.label}>{high - 1}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              marginLeft: `${left}%`,
              width: `${Math.max(width, 2)}%`,
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
    marginVertical: 8,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontFamily: "play-fair-bold",
    color: Colors.accent,
    fontSize: 13,
  },
  mid: {
    fontFamily: "play-fair",
    color: Colors.textDim,
    fontSize: 12,
  },
  track: {
    height: 10,
    borderRadius: 8,
    backgroundColor: Colors.bgElevated,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
});
