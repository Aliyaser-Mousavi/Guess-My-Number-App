import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export function formatElapsed(ms: number) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function GameTimer({
  running,
  startAt: _startAt,
  paused = false,
}: {
  running: boolean;
  startAt?: number;
  paused?: boolean;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = React.useRef(0);

  useEffect(() => {
    if (!running || paused) {
      lastTickRef.current = Date.now();
      return;
    }

    lastTickRef.current = Date.now();
    const id = setInterval(() => {
      const current = Date.now();
      const delta = current - lastTickRef.current;
      lastTickRef.current = current;
      setElapsedMs((prev) => prev + delta);
    }, 250);

    return () => clearInterval(id);
  }, [running, paused]);

  return (
    <View style={styles.chip}>
      <Text style={styles.label}>TIME</Text>
      <Text style={styles.value}>{formatElapsed(elapsedMs)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 72,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  value: {
    fontFamily: FontFamily.display,
    color: Colors.mint,
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
});
