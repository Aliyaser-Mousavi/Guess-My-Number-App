import Colors from "@/constants/colors";
import { Radius, Shadows } from "@/constants/theme";
import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type CardVariant = "default" | "elevated" | "accent" | "bordered";

export default function Card({
  children,
  style,
  variant = "default",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
}) {
  return (
    <View
      style={[
        styles.base,
        variant === "elevated" && styles.elevated,
        variant === "accent" && styles.accent,
        variant === "bordered" && styles.bordered,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    padding: 20,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.borderStrong,
  },
  accent: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderAccent,
  },
  bordered: {
    backgroundColor: "transparent",
    borderColor: Colors.borderStrong,
  },
});
