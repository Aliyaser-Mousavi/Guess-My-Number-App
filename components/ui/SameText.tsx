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
    <View style={styles.container}>
      <Text style={[styles.instructionText, style]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    fontFamily: "play-fair",
    color: Colors.accent500,
    fontSize: 22,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
