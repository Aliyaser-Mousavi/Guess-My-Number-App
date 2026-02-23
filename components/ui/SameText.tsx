import Colors from "@/constants/colors";
import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View } from "react-native";

export default function SameText({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <View>
      <Text style={[styles.instructionText, style]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  instructionText: {
    fontFamily: "play-fair",
    color: Colors.accent500,
    fontSize: 24,
  },
});
