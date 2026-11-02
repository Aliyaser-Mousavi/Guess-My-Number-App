import Colors from "@/constants/colors";
import type {
  ColorBlindOption,
  CompetitiveRankTier,
  ThemeId,
} from "@/types/game";

export type ThemeColors = typeof Colors;

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  tagline: string;
  gradientColors: [string, string, string];
  glowPrimary: string;
  glowAccent: string;
  colors: ThemeColors;
  requiredLevel?: number;
  requiredRankTier?: CompetitiveRankTier;
};

export const THEME_CATALOG: ThemeDefinition[] = [
  {
    id: "midnight",
    name: "Midnight Arcade",
    tagline: "Flagship dark violet & neon cyan aesthetic",
    gradientColors: ["#070E18", "#0B1626", "#07131F"],
    glowPrimary: "rgba(0, 210, 180, 0.28)",
    glowAccent: "rgba(255, 184, 0, 0.25)",
    colors: Colors,
  },
  {
    id: "ocean",
    name: "Ocean Abyss",
    tagline: "Deep sub-aquatic bioluminescent depths",
    gradientColors: ["#030B17", "#061A30", "#041424"],
    glowPrimary: "rgba(0, 240, 255, 0.3)",
    glowAccent: "rgba(56, 239, 125, 0.25)",
    requiredLevel: 3,
    colors: {
      ...Colors,
      bg: "#030B17",
      bgMid: "#06162A",
      bgElevated: "#0A223E",
      surface: "#0D2B4D",
      surfaceSoft: "#133863",
      surfaceHighlight: "#1B4A7F",
      primary: "#00F0FF",
      primaryDark: "#00B4D8",
      primarySoft: "rgba(0, 240, 255, 0.14)",
      primaryGlow: "rgba(0, 240, 255, 0.28)",
      accent: "#38EF7D",
      accentSoft: "#5CFA99",
      accentDark: "#11998E",
      accentGlow: "rgba(56, 239, 125, 0.25)",
      coral: "#FF4B72",
      mint: "#00F5D4",
      cyan: "#00BBF9",
      border: "rgba(0, 240, 255, 0.12)",
      borderStrong: "rgba(0, 240, 255, 0.22)",
      borderAccent: "rgba(0, 240, 255, 0.4)",
      borderGold: "rgba(56, 239, 125, 0.35)",
    },
  },
  {
    id: "emerald",
    name: "Emerald Matrix",
    tagline: "High-frequency cyber digital grid",
    gradientColors: ["#041008", "#082112", "#05160C"],
    glowPrimary: "rgba(0, 255, 136, 0.3)",
    glowAccent: "rgba(166, 255, 0, 0.25)",
    requiredLevel: 7,
    colors: {
      ...Colors,
      bg: "#041008",
      bgMid: "#071A0E",
      bgElevated: "#0B2516",
      surface: "#0F321E",
      surfaceSoft: "#16442A",
      surfaceHighlight: "#1E5737",
      primary: "#00FF88",
      primaryDark: "#00CC6A",
      primarySoft: "rgba(0, 255, 136, 0.14)",
      primaryGlow: "rgba(0, 255, 136, 0.28)",
      accent: "#A6FF00",
      accentSoft: "#BEFF40",
      accentDark: "#7ACC00",
      accentGlow: "rgba(166, 255, 0, 0.25)",
      coral: "#FF3366",
      mint: "#2ED573",
      cyan: "#00F5D4",
      border: "rgba(0, 255, 136, 0.12)",
      borderStrong: "rgba(0, 255, 136, 0.22)",
      borderAccent: "rgba(0, 255, 136, 0.4)",
      borderGold: "rgba(166, 255, 0, 0.35)",
    },
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    tagline: "Warm synthwave twilight horizon",
    gradientColors: ["#140916", "#260F2B", "#180A1A"],
    glowPrimary: "rgba(255, 94, 58, 0.3)",
    glowAccent: "rgba(255, 176, 32, 0.25)",
    requiredRankTier: "silver",
    requiredLevel: 10,
    colors: {
      ...Colors,
      bg: "#140916",
      bgMid: "#1C0C1F",
      bgElevated: "#26102D",
      surface: "#32163B",
      surfaceSoft: "#421D4E",
      surfaceHighlight: "#552664",
      primary: "#FF5E3A",
      primaryDark: "#E03E1A",
      primarySoft: "rgba(255, 94, 58, 0.14)",
      primaryGlow: "rgba(255, 94, 58, 0.28)",
      accent: "#FFB020",
      accentSoft: "#FFC250",
      accentDark: "#D48C00",
      accentGlow: "rgba(255, 176, 32, 0.25)",
      coral: "#FF4757",
      mint: "#2ED573",
      cyan: "#F368E0",
      border: "rgba(255, 94, 58, 0.14)",
      borderStrong: "rgba(255, 94, 58, 0.25)",
      borderAccent: "rgba(255, 94, 58, 0.4)",
      borderGold: "rgba(255, 176, 32, 0.35)",
    },
  },
];

export class ThemeService {
  /**
   * Retrieves a theme definition by its ID, defaulting to Midnight.
   */
  static getTheme(themeId: ThemeId): ThemeDefinition {
    const found = THEME_CATALOG.find((t) => t.id === themeId);
    return found ?? THEME_CATALOG[0];
  }

  /**
   * Checks whether a theme is unlocked for a given player level and rank tier.
   */
  static isThemeUnlocked(
    theme: ThemeDefinition,
    level: number,
    rankTier: CompetitiveRankTier,
  ): boolean {
    if (theme.id === "midnight") return true;
    if (theme.requiredLevel && level >= theme.requiredLevel) return true;
    if (theme.requiredRankTier) {
      const rankOrder: CompetitiveRankTier[] = [
        "beginner",
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "master",
        "grandmaster",
      ];
      const playerRankIndex = rankOrder.indexOf(rankTier);
      const requiredRankIndex = rankOrder.indexOf(theme.requiredRankTier);
      if (playerRankIndex >= requiredRankIndex && requiredRankIndex !== -1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Resolves the final color palette applying high contrast and color-blind adaptations.
   */
  static resolveColors(
    themeId: ThemeId,
    options?: {
      highContrast?: boolean;
      colorBlindMode?: ColorBlindOption;
    },
  ): ThemeColors {
    const base = { ...this.getTheme(themeId).colors };

    // Apply color blind adaptations
    if (options?.colorBlindMode === "protanopia" || options?.colorBlindMode === "deuteranopia") {
      // Replace red/green with High-Contrast Blue/Amber
      base.coral = "#0084FF";
      base.danger = "#0084FF";
      base.mint = "#FFB800";
      base.success = "#FFB800";
    } else if (options?.colorBlindMode === "tritanopia") {
      // Replace blue/yellow with High-Contrast Red/Cyan
      base.coral = "#FF3366";
      base.danger = "#FF3366";
      base.accent = "#00F0FF";
      base.warning = "#FF5E3A";
    }

    // Apply High-Contrast overrides
    if (options?.highContrast) {
      base.bg = "#000000";
      base.bgMid = "#0A0A0A";
      base.bgElevated = "#141414";
      base.surface = "#1C1C1C";
      base.surfaceSoft = "#2A2A2A";
      base.surfaceHighlight = "#383838";
      base.text = "#FFFFFF";
      base.textMuted = "#D0D0D0";
      base.textDim = "#B0B0B0";
      base.border = "rgba(255, 255, 255, 0.35)";
      base.borderStrong = "#FFFFFF";
      base.borderAccent = base.primary;
      base.borderGold = base.accent;
    }

    return base;
  }
}

