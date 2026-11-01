import Colors from "@/constants/colors";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

function formatMs(ms: number) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GameTimer({
  running,
  startAt,
}: {
  running: boolean;
  startAt: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = Math.max(0, now - startAt);

  return (
    <View style={styles.chip}>
      <Text style={styles.label}>TIME</Text>
      <Text style={styles.value}>{formatMs(elapsed)}</Text>
    </View>
  );
}

export function formatElapsed(ms: number) {
  return formatMs(ms);
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    minWidth: 72,
  },
  label: {
    fontFamily: "play-fair",
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
  },
  value: {
    fontFamily: "play-fair-bold",
    color: Colors.mint,
    fontSize: 16,
  },
});
