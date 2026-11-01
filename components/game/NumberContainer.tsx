import Colors from "@/constants/colors";
import React, { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

export default function NumberContainer({
  children,
  label,
}: {
  children: number | string;
  label?: string;
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.08, { damping: 8 }),
      withSpring(1, { damping: 12 }),
    );
  }, [children, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.container,
          isSmall && styles.smallContainer,
          animStyle,
        ]}
      >
        <Text style={[styles.numberText, isSmall && styles.smallNumberText]}>
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: 12,
  },
  label: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  container: {
    minWidth: 140,
    paddingVertical: 22,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  smallContainer: {
    minWidth: 110,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  numberText: {
    color: Colors.accent,
    fontSize: 48,
    fontFamily: "play-fair-bold",
    textAlign: "center",
  },
  smallNumberText: {
    fontSize: 34,
  },
});
