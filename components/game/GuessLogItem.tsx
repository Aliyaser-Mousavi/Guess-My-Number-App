import Colors from "@/constants/colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function GuessLogItem({
  roundNumber,
  guess,
  note,
}: {
  roundNumber: number;
  guess: number;
  note?: string;
}) {
  return (
    <View style={styles.listItem}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{roundNumber}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.guess}>{guess}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listItem: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginVertical: 5,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "play-fair-bold",
    color: Colors.white,
    fontSize: 14,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guess: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 18,
  },
  note: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 13,
  },
});
