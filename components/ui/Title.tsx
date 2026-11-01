import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

export default function Title({
  children,
  style,
  size = "lg",
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const fontSize = { sm: 18, md: 22, lg: 28, xl: 36 }[size];
  return (
    <Text style={[styles.title, { fontSize }, style]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    textAlign: "center",
    letterSpacing: 0.4,
  },
});
