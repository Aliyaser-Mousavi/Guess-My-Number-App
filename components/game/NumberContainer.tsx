import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

export default function NumberContainer({ children }: { children: number }) {
  const { width } = useWindowDimensions();

  const isSmallDevice = width < 380;

  return (
    <View style={[styles.container, isSmallDevice && styles.smallContainer]}>
      <Text
        style={[styles.numberText, isSmallDevice && styles.smallNumberText]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 4,
    borderColor: Colors.accent500,
    padding: 24,
    borderRadius: 12, // Slightly more rounded for a modern look
    margin: 24,
    alignItems: "center",
    justifyContent: "center",
    // Adding a subtle glow effect for gaming feel
    shadowColor: Colors.accent500,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 8,
    backgroundColor: "rgba(0,0,0,0.2)", // Slight dark background to pop the number
  },
  smallContainer: {
    padding: 12,
    margin: 12,
  },
  numberText: {
    color: Colors.accent500,
    fontSize: 42, // Increased for better visibility
    fontFamily: "play-fair-bold",
    textAlign: "center",
  },
  smallNumberText: {
    fontSize: 28,
  },
});
