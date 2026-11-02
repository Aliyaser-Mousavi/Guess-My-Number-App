import Colors from "@/constants/colors";
import { useGame } from "@/context/GameProvider";
import { ThemeService } from "@/services/theme/ThemeService";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function ScreenBackground({ children, style }: Props) {
  let gradientColors: [string, string, string] = [
    Colors.bg,
    "#0B1626",
    "#07131F",
  ];
  let glowPrimary = Colors.primaryGlow;
  let glowAccent = Colors.accentGlow;
  let reducedMotion = false;
  let highContrast = false;

  try {
    const game = useGame();
    if (game?.settings) {
      const themeDef = ThemeService.getTheme(game.settings.themeId);
      const resolved = ThemeService.resolveColors(game.settings.themeId, {
        highContrast: game.settings.highContrast,
        colorBlindMode: game.settings.colorBlindMode,
      });

      if (game.settings.highContrast) {
        gradientColors = ["#000000", "#080808", "#020202"];
      } else {
        gradientColors = themeDef.gradientColors;
      }
      glowPrimary = resolved.primaryGlow;
      glowAccent = resolved.accentGlow;
      reducedMotion = game.settings.reducedMotion;
      highContrast = game.settings.highContrast;
    }
  } catch {
    // Render default fallback outside of provider
  }

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: gradientColors[0] },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Dynamic atmospheric glows (omitted in high-contrast or reduced-motion) */}
      {!highContrast && !reducedMotion && (
        <>
          <View
            style={[styles.glowTop, { backgroundColor: glowPrimary }]}
            pointerEvents="none"
          />
          <View
            style={[styles.glowBottom, { backgroundColor: glowAccent }]}
            pointerEvents="none"
          />
          <View style={styles.glowCenter} pointerEvents="none" />
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.primaryGlow,
    opacity: 0.8,
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.accentGlow,
    opacity: 0.7,
  },
  glowCenter: {
    position: "absolute",
    top: "35%",
    left: "50%",
    marginLeft: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0, 210, 180, 0.04)",
  },
});
