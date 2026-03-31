import Colors from "@/constants/colors";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

export default function Title({ children }: { children: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  title: {
    fontFamily: "play-fair-bold",
    color: "white",
    fontSize: 26,
    textAlign: "center",
    borderWidth: Platform.select({ ios: 0, android: 2 }),
    borderColor: Colors.accent500,
    padding: 12,
    borderRadius: 8,
    maxWidth: "90%",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
