import Colors from "@/constants/colors";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
export default function NumberContainer({ children }: { children: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.numberText}>{children}</Text>
    </View>
  );
}
const deviceWidth = Dimensions.get("window").width;

const styles = StyleSheet.create({
  container: {
    borderWidth: 4,
    borderColor: Colors.accent500,
    padding: deviceWidth < 380 ? 12 : 24,
    borderRadius: 8,
    margin: deviceWidth < 380 ? 12 : 24,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: "#ddb52f",
    fontSize: deviceWidth < 380 ? 28 : 36,
    fontFamily: "play-fair-bold",
  },
});
