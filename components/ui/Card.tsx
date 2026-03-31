import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

export default function Card({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  const marginTopDistance = width < 380 ? 18 : 36;

  return (
    <View style={[styles.card, { marginTop: marginTopDistance }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: Colors.primary800,
    elevation: 12,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.4,
  },
});
