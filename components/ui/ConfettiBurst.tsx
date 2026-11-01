import Colors from "@/constants/colors";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const DOTS = Array.from({ length: 18 }, (_, i) => i);

export default function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DOTS.map((i) => (
        <ConfettiDot key={i} index={i} />
      ))}
    </View>
  );
}

function ConfettiDot({ index }: { index: number }) {
  const y = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const left = 8 + ((index * 37) % 84);
  const color =
    [Colors.accent, Colors.primary, Colors.mint, Colors.coral, Colors.accentSoft][
      index % 5
    ];

  useEffect(() => {
    opacity.value = withDelay(index * 30, withTiming(1, { duration: 200 }));
    y.value = withDelay(
      index * 30,
      withTiming(420 + (index % 5) * 40, { duration: 1400 + (index % 4) * 200 }),
    );
    opacity.value = withDelay(
      900 + index * 20,
      withTiming(0, { duration: 500 }),
    );
  }, [index, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${index * 20}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: `${left}%`,
          backgroundColor: color,
          width: 8 + (index % 3) * 3,
          height: 8 + (index % 2) * 4,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: 40,
    borderRadius: 3,
  },
});
