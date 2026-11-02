import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function GuessLogItem({
  roundNumber,
  guess,
  note,
}: {
  roundNumber: number;
  guess: number;
  note?: string;
}) {
  const isCorrect = note === "correct!";
  const isLow = note === "too low";
  const isHigh = note === "too high";
  const isOracle = note === "oracle";

  return (
    <View style={styles.listItem}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>#{roundNumber}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.guess}>{guess}</Text>
        {note ? (
          <View
            style={[
              styles.pill,
              isCorrect && styles.pillCorrect,
              isLow && styles.pillLow,
              isHigh && styles.pillHigh,
              isOracle && styles.pillOracle,
            ]}
          >
            {isCorrect && (
              <Ionicons name="checkmark-circle" size={13} color={Colors.mint} />
            )}
            {isLow && (
              <Ionicons name="arrow-up" size={13} color={Colors.accent} />
            )}
            {isHigh && (
              <Ionicons name="arrow-down" size={13} color={Colors.coral} />
            )}
            {isOracle && (
              <Ionicons name="sparkles" size={12} color={Colors.primary} />
            )}
            <Text
              style={[
                styles.note,
                isCorrect && { color: Colors.mint },
                isLow && { color: Colors.accent },
                isHigh && { color: Colors.coral },
                isOracle && { color: Colors.primary },
              ]}
            >
              {isOracle ? "Oracle" : note}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: FontFamily.display,
    color: Colors.primary,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  content: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guess: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
  },
  pillCorrect: {
    backgroundColor: "rgba(46, 213, 115, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(46, 213, 115, 0.3)",
  },
  pillLow: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  pillHigh: {
    backgroundColor: "rgba(255, 82, 82, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.25)",
  },
  pillOracle: {
    backgroundColor: "rgba(0, 210, 180, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.2)",
  },
  note: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    textTransform: "capitalize",
  },
});
