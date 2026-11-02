import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import type { ProximityFeedback } from "@/services/proximity/ProximityService";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  feedback: ProximityFeedback | null;
  visible?: boolean;
};

export default function ProximityIndicator({ feedback, visible = true }: Props) {
  if (!visible || !feedback || feedback.distance === 0) {
    return null;
  }

  const iconName = (
    feedback.icon === "flame"
      ? "flame"
      : feedback.icon === "flame-outline"
        ? "flame-outline"
        : feedback.icon === "sunny"
          ? "sunny"
          : feedback.icon === "snow"
            ? "snow"
            : "cube"
  ) as keyof typeof Ionicons.glyphMap;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: feedback.color + "60",
          backgroundColor: feedback.color + "15",
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: feedback.color + "30" }]}>
        <Ionicons name={iconName} size={15} color={feedback.color} />
      </View>
      <View style={styles.textColumn}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: feedback.color }]}>
            {feedback.label}
          </Text>
          <Text style={styles.distanceText}>
            ({feedback.distance} {feedback.distance === 1 ? "away" : "nums away"})
          </Text>
        </View>
        <Text style={styles.sublabel}>{feedback.sublabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginVertical: 6,
    alignSelf: "center",
    maxWidth: "92%",
    gap: 10,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  textColumn: {
    flexShrink: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.display,
    fontSize: 12,
    letterSpacing: 1,
  },
  distanceText: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textDim,
  },
  sublabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
});

