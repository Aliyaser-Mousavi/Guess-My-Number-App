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
    borderWidth: 2,
    borderColor: "#b3b2ae",
    padding: 12,
    marginBottom: 24,
    borderRadius: 10,
  },
  title: {
    fontFamily: "play-fair-bold",
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    // borderWidth: Platform.OS === "android" ? 2 : 0,
    borderWidth: Platform.select({ ios: 0, android: 2 }),
    borderColor: "white",
    padding: 12,
    borderRadius: 6,
    maxWidth: "80%",
    width: 300,
  },
});
