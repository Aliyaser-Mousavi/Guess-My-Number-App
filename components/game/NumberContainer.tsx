import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { LocalizationService } from "@/services/localization/LocalizationService";
import type { NumberDisplayStyle } from "@/types/game";
import React, { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function NumberContainer({
  children,
  label,
  accentColor = Colors.accent,
}: {
  children: number | string;
  label?: string;
  accentColor?: string;
}) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  let styleMode: NumberDisplayStyle = "arcade_glow";
  let animMode = "pulse";
  let digitFormat: "latin" | "persian" = "latin";
  let reducedMotion = false;

  try {
    const game = useGame();
    if (game?.settings) {
      styleMode = game.settings.numberStyle ?? "arcade_glow";
      animMode = game.settings.numberAnimation ?? "pulse";
      digitFormat = game.settings.digitFormat ?? "latin";
      reducedMotion = game.settings.reducedMotion ?? false;
    }
  } catch {
    // default
  }

  useEffect(() => {
    if (reducedMotion || animMode === "none") {
      scale.value = 1;
      opacity.value = 1;
      return;
    }

    if (animMode === "flicker") {
      opacity.value = withSequence(
        withTiming(0.3, { duration: 70 }),
        withTiming(1, { duration: 90 }),
        withTiming(0.6, { duration: 60 }),
        withTiming(1, { duration: 100 }),
      );
    } else if (animMode === "bounce") {
      scale.value = withSequence(
        withSpring(1.15, { damping: 6, stiffness: 260 }),
        withSpring(1, { damping: 10, stiffness: 180 }),
      );
    } else {
      // standard spring pulse
      scale.value = withSequence(
        withSpring(1.08, { damping: 9, stiffness: 220 }),
        withSpring(1, { damping: 14, stiffness: 180 }),
      );
    }
  }, [children, scale, opacity, animMode, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const formattedValue = LocalizationService.formatNumber(children, digitFormat);

  // Style decorators
  let displayedText = formattedValue;
  if (styleMode === "retro_pixel") {
    displayedText = `[ ${formattedValue} ]`;
  } else if (styleMode === "cyber_matrix") {
    displayedText = `> ${formattedValue} <`;
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View
        style={[
          styles.container,
          isSmall && styles.smallContainer,
          styleMode === "holographic_glass" && styles.styleHolo,
          styleMode === "retro_pixel" && styles.stylePixel,
          styleMode === "minimal_clean" && styles.styleMinimal,
          styleMode === "cyber_matrix" && styles.styleCyber,
          { borderColor: accentColor },
          styleMode === "arcade_glow" && {
            shadowColor: accentColor,
            shadowOpacity: 0.4,
            shadowRadius: 14,
          },
          animStyle,
        ]}
      >
        <Text
          style={[
            styles.numberText,
            isSmall && styles.smallNumberText,
            styleMode === "retro_pixel" && styles.monoText,
            { color: accentColor },
          ]}
        >
          {displayedText}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: 14,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  container: {
    minWidth: 150,
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: Radius.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  smallContainer: {
    minWidth: 120,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: Radius.lg,
  },
  numberText: {
    fontSize: 52,
    lineHeight: 58,
    fontFamily: FontFamily.display,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    letterSpacing: -1,
  },
  smallNumberText: {
    fontSize: 38,
    lineHeight: 44,
  },
  monoText: {
    fontFamily: FontFamily.mono,
    letterSpacing: 2,
  },
  styleHolo: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1.5,
    borderRadius: Radius.xl,
    shadowColor: Colors.cyan,
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  stylePixel: {
    borderRadius: Radius.xs,
    borderWidth: 2.5,
    backgroundColor: "#05060A",
    shadowOpacity: 0,
    elevation: 0,
  },
  styleMinimal: {
    borderRadius: Radius.full,
    borderWidth: 1,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 40,
  },
  styleCyber: {
    borderRadius: Radius.sm,
    borderWidth: 2,
    backgroundColor: "rgba(0, 255, 136, 0.06)",
    shadowColor: "#00FF88",
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
