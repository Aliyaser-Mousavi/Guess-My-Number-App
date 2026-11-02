import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function StatChip({
  icon,
  label,
  value,
  color = Colors.primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.iconWrap, { backgroundColor: color + "1F" }]}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        <Text numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    minWidth: "45%",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 17,
    fontVariant: ["tabular-nums"],
  },
});
