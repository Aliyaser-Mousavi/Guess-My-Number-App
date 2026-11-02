import { Platform, type TextStyle, type ViewStyle } from "react-native";
import AppColors from "./colors";

export const FontFamily = {
  // Display font: Space Grotesk
  display: "SpaceGrotesk-Bold",
  displaySemiBold: "SpaceGrotesk-SemiBold",
  displayMedium: "SpaceGrotesk-Medium",
  displayRegular: "SpaceGrotesk-Regular",

  // Interface font: Inter
  body: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  bodySemiBold: "Inter-SemiBold",
  bodyBold: "Inter-Bold",

  // Handy aliases for typography consistency
  mono: "SpaceGrotesk-Regular",
  monoMedium: "SpaceGrotesk-Medium",
  monoBold: "SpaceGrotesk-Bold",
  sans: "Inter-Regular",
  sansMedium: "Inter-Medium",
  sansBold: "Inter-Bold",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const Radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  full: 9999,
};

export const Shadows = {
  sm: Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }),
  glowTeal: Platform.select<ViewStyle>({
    ios: {
      shadowColor: AppColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
  glowGold: Platform.select<ViewStyle>({
    ios: {
      shadowColor: AppColors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
};

export const Typography = {
  heroNumber: {
    fontFamily: FontFamily.display,
    fontSize: 54,
    lineHeight: 60,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
    letterSpacing: -1,
  },
  display: {
    fontFamily: FontFamily.display,
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  titleXl: {
    fontFamily: FontFamily.display,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  titleLg: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  titleMd: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  titleSm: {
    fontFamily: FontFamily.displayMedium,
    fontSize: 15,
    lineHeight: 20,
  },
  body: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  caption: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  eyebrow: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2.2,
    textTransform: "uppercase" as TextStyle["textTransform"],
  },
  numberMetric: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
  },
  numberStatLarge: {
    fontFamily: FontFamily.display,
    fontSize: 40,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
  },
};

const tintColorLight = "#0a7ea4";
const tintColorDark = "#00D2B4";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: AppColors.text,
    background: AppColors.bg,
    tint: tintColorDark,
    icon: AppColors.textMuted,
    tabIconDefault: AppColors.textDim,
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter-Regular",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "SpaceGrotesk-Regular",
  },
  default: {
    sans: "Inter-Regular",
    serif: "serif",
    rounded: "normal",
    mono: "SpaceGrotesk-Regular",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "'Space Grotesk', monospace",
  },
});
