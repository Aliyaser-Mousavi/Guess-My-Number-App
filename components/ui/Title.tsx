import Colors from "@/constants/colors";
import { FontFamily } from "@/constants/theme";
import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

export default function Title({
  children,
  style,
  size = "lg",
  color = Colors.text,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  size?: "sm" | "md" | "lg" | "xl" | "display";
  color?: string;
}) {
  const sizeStyles = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
    xl: styles.xl,
    display: styles.display,
  }[size];

  return (
    <Text style={[styles.base, sizeStyles, { color }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FontFamily.display,
    textAlign: "center",
  },
  sm: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  md: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  lg: {
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  xl: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  display: {
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
});
