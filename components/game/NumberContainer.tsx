import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
export default function NumberContainer({ children }: { children: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.numberText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 4,
    borderColor: Colors.accent500,
    padding: 24,
    borderRadius: 8,
    margin: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: "#ddb52f",
    fontSize: 36,
    fontFamily: "play-fair-bold",
  },
});
