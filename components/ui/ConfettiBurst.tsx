import Colors from "@/constants/colors";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const PIECES = Array.from({ length: 24 }, (_, i) => i);

export default function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PIECES.map((i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
}

function ConfettiPiece({ index }: { index: number }) {
  const y = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const left = 6 + ((index * 39) % 88);
  const color = [
    Colors.accent,
    Colors.primary,
    Colors.mint,
    Colors.coral,
    Colors.cyan,
    Colors.accentSoft,
  ][index % 6];

  useEffect(() => {
    opacity.value = withDelay(index * 25, withTiming(1, { duration: 180 }));
    y.value = withDelay(
      index * 25,
      withTiming(480 + (index % 6) * 50, { duration: 1500 + (index % 5) * 200 }),
    );
    rotation.value = withDelay(
      index * 25,
      withTiming(360 + index * 45, { duration: 1600 }),
    );
    opacity.value = withDelay(
      1000 + index * 20,
      withTiming(0, { duration: 500 }),
    );
  }, [index, opacity, rotation, y]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const isBar = index % 3 === 0;

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: `${left}%`,
          backgroundColor: color,
          width: isBar ? 12 : 8,
          height: isBar ? 6 : 8,
          borderRadius: isBar ? 2 : 4,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: "absolute",
    top: 30,
  },
});
