import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
export default function GuessLogItem({
  roundNumber,
  guess,
}: {
  roundNumber: number;
  guess: number;
}) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.itemText}>#{roundNumber}</Text>
      <Text style={styles.itemText}>{"User Number's Guess: " + guess}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    borderColor: Colors.primary800,
    borderWidth: 1,
    borderRadius: 40,
    padding: 12,
    marginVertical: 8,
    backgroundColor: Colors.accent500,
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    elevation: 4,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.25,
  },
  itemText: {
    fontFamily: "play-fair",
  },
});
