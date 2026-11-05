import Colors from "@/constants/colors";
import type {
  CompetitiveRankTier,
  CosmeticItem,
  CosmeticsState,
  PlayerProfile,
} from "../../types/game";

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // --- Avatars ---
  {
    id: "oracle_orb",
    name: "Oracle Orb",
    description: "Classic mystic energy orb of the Number Oracle",
    type: "avatar",
    icon: "sparkles",
    previewColor: Colors.accent,
    requiredLevel: 1,
  },
  {
    id: "neon_spark",
    name: "Neon Spark",
    description: "Vibrant high-voltage prism with neon flare",
    type: "avatar",
    icon: "flash",
    previewColor: Colors.primary,
    requiredLevel: 1,
  },
  {
    id: "cipher_cube",
    name: "Cipher Cube",
    description: "Multi-dimensional cryptographic hypercube",
    type: "avatar",
    icon: "cube",
    previewColor: Colors.mint,
    requiredLevel: 1,
  },
  {
    id: "quantum_core",
    name: "Quantum Core",
    description: "Pulsing subatomic probability generator",
    type: "avatar",
    icon: "nuclear",
    previewColor: "#00E5FF",
    requiredLevel: 5,
  },
  {
    id: "mystic_eye",
    name: "Mystic Eye",
    description: "The all-seeing eye of numerical divination",
    type: "avatar",
    icon: "eye",
    previewColor: "#B388FF",
    requiredLevel: 10,
  },
  {
    id: "cybernetic_mind",
    name: "Cybernetic Mind",
    description: "Synthesized neural binary calculation engine",
    type: "avatar",
    icon: "hardware-chip",
    previewColor: "#FF5252",
    requiredLevel: 15,
  },
  {
    id: "golden_hunter",
    name: "Golden Hunter",
    description: "Gilded arcade prestige bestowed upon champions",
    type: "avatar",
    icon: "trophy",
    previewColor: "#FFD700",
    requiredLevel: 25,
    requiredRankTier: "gold",
  },
  {
    id: "void_sovereign",
    name: "Void Sovereign",
    description: "Cosmic avatar of boundless intuition and mastery",
    type: "avatar",
    icon: "planet",
    previewColor: "#A855F7",
    requiredLevel: 40,
    requiredRankTier: "diamond",
  },

  // --- Themes ---
  {
    id: "midnight_arcade",
    name: "Midnight Arcade",
    description: "Default obsidian surface with gold and electric indigo accents",
    type: "theme",
    icon: "color-palette",
    previewColor: Colors.accent,
    requiredLevel: 1,
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    description: "Cyan and hot magenta retro wave arcade glow",
    type: "theme",
    icon: "color-palette",
    previewColor: "#00E5FF",
    requiredLevel: 8,
  },
  {
    id: "solar_gold",
    name: "Solar Gold",
    description: "Warm amber and radiant molten gold finish",
    type: "theme",
    icon: "color-palette",
    previewColor: "#FFB800",
    requiredLevel: 20,
  },
  {
    id: "emerald_matrix",
    name: "Emerald Matrix",
    description: "High-contrast digital phosphor green terminal",
    type: "theme",
    icon: "color-palette",
    previewColor: "#22C55E",
    requiredLevel: 30,
  },
  {
    id: "deep_abyss",
    name: "Deep Abyss",
    description: "Bioluminescent deep ocean sapphire tones",
    type: "theme",
    icon: "color-palette",
    previewColor: "#3B82F6",
    requiredLevel: 50,
  },

  // --- Number Styles ---
  {
    id: "space_grotesk",
    name: "Space Grotesk",
    description: "Precision-crafted modern geometric typography",
    type: "numberStyle",
    icon: "text",
    requiredLevel: 1,
  },
  {
    id: "arcade_pixel",
    name: "Arcade Digital",
    description: "Bold 8-bit digital segment numbers",
    type: "numberStyle",
    icon: "calculator",
    requiredLevel: 6,
  },
  {
    id: "futuristic_neon",
    name: "Futuristic Glow",
    description: "High-glow illuminated stencil typography",
    type: "numberStyle",
    icon: "contrast",
    requiredLevel: 18,
  },
  {
    id: "terminal_mono",
    name: "Terminal Mono",
    description: "Raw monospace console font for code-breakers",
    type: "numberStyle",
    icon: "code-slash",
    requiredLevel: 28,
  },

  // --- Titles ---
  {
    id: "apprentice_hunter",
    name: "Apprentice Hunter",
    description: "Awarded to every aspiring intuition seeker",
    type: "title",
    icon: "ribbon-outline",
    requiredLevel: 1,
  },
  {
    id: "number_seeker",
    name: "Number Seeker",
    description: "Recognized for early dedication to the hunt",
    type: "title",
    icon: "search",
    requiredLevel: 3,
  },
  {
    id: "skilled_guesser",
    name: "Skilled Guesser",
    description: "Mastery over the fundamentals of higher and lower",
    type: "title",
    icon: "bulb",
    requiredLevel: 5,
  },
  {
    id: "code_breaker",
    name: "Code Breaker",
    description: "Adept at dismantling numeric cryptographic targets",
    type: "title",
    icon: "key",
    requiredLevel: 10,
  },
  {
    id: "oracle_whisperer",
    name: "Oracle Whisperer",
    description: "Understands the subtle rhythms of the Oracle",
    type: "title",
    icon: "sparkles",
    requiredLevel: 18,
  },
  {
    id: "master_mind",
    name: "Master Mind",
    description: "A calculated tactician with exceptional accuracy",
    type: "title",
    icon: "diamond",
    requiredLevel: 25,
  },
  {
    id: "speed_demon_title",
    name: "Speed Demon",
    description: "Awarded for unlocking the Speed Demon achievement",
    type: "title",
    icon: "flash",
    requiredAchievementId: "speed_demon",
  },
  {
    id: "flawless_hunter",
    name: "Flawless Mind",
    description: "Awarded for completing games with zero hints",
    type: "title",
    icon: "eye-off",
    requiredAchievementId: "perfect_hintless",
  },
  {
    id: "arcade_legend_title",
    name: "Arcade Sovereign",
    description: "Peak status for seasoned MarsGuess masters",
    type: "title",
    icon: "trophy",
    requiredLevel: 50,
  },
];

export class CosmeticsService {
  /**
   * Returns list of all cosmetics with their active unlock and equipped status.
   */
  static getDecoratedCatalog(
    level: number,
    unlockedAchievements: string[],
    rankTier: CompetitiveRankTier,
    cosmeticsState: CosmeticsState,
    profile: PlayerProfile,
  ): CosmeticItem[] {
    const tierRankValues: Record<CompetitiveRankTier, number> = {
      beginner: 0,
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
      diamond: 5,
      master: 6,
      grandmaster: 7,
    };
    const currentTierRank = tierRankValues[rankTier] ?? 0;

    return COSMETIC_CATALOG.map((item) => {
      let isUnlocked = false;

      // Check level requirement
      if (item.requiredLevel != null && level >= item.requiredLevel) {
        isUnlocked = true;
      }

      // Check achievement requirement
      if (
        item.requiredAchievementId &&
        unlockedAchievements.includes(item.requiredAchievementId)
      ) {
        isUnlocked = true;
      }

      // Check rank tier requirement
      if (item.requiredRankTier) {
        const requiredRank = tierRankValues[item.requiredRankTier] ?? 0;
        if (currentTierRank >= requiredRank) {
          isUnlocked = true;
        }
      }

      // Check explicit unlocks stored in state
      if (item.type === "avatar" && cosmeticsState.unlockedAvatars.includes(item.id)) {
        isUnlocked = true;
      }
      if (item.type === "theme" && cosmeticsState.unlockedThemes.includes(item.id)) {
        isUnlocked = true;
      }
      if (
        item.type === "numberStyle" &&
        cosmeticsState.unlockedNumberStyles.includes(item.id)
      ) {
        isUnlocked = true;
      }
      if (
        item.type === "title" &&
        cosmeticsState.unlockedTitles?.includes(item.id)
      ) {
        isUnlocked = true;
      }

      // Check if equipped
      let isEquipped = false;
      if (item.type === "avatar") {
        isEquipped = cosmeticsState.activeAvatar === item.id;
      } else if (item.type === "theme") {
        isEquipped = cosmeticsState.activeTheme === item.id;
      } else if (item.type === "numberStyle") {
        isEquipped = cosmeticsState.activeNumberStyle === item.id;
      } else if (item.type === "title") {
        isEquipped = profile.titleId === item.id;
      }

      return {
        ...item,
        isUnlocked,
        isEquipped,
      };
    });
  }

  /**
   * Equips a cosmetic item, returning the updated state and profile.
   */
  static equip(
    item: CosmeticItem,
    cosmeticsState: CosmeticsState,
    profile: PlayerProfile,
  ): { nextCosmetics: CosmeticsState; nextProfile: PlayerProfile } {
    const nextCosmetics = { ...cosmeticsState };
    const nextProfile = { ...profile };

    if (item.type === "avatar") {
      nextCosmetics.activeAvatar = item.id;
      nextProfile.avatarId = item.id;
    } else if (item.type === "theme") {
      nextCosmetics.activeTheme = item.id;
    } else if (item.type === "numberStyle") {
      nextCosmetics.activeNumberStyle = item.id;
    } else if (item.type === "title") {
      nextProfile.titleId = item.id;
      nextCosmetics.activeTitle = item.id;
    }

    return { nextCosmetics, nextProfile };
  }

  /**
   * Resolves a canonical title identifier to its formatted display title.
   */
  static getTitleName(titleId?: string): string {
    if (!titleId) return "Apprentice Hunter";
    const item = COSMETIC_CATALOG.find(
      (c) => c.id === titleId && c.type === "title",
    );
    if (item) return item.name;

    const canonicalMap: Record<string, string> = {
      apprentice_hunter: "Apprentice Hunter",
      number_seeker: "Number Seeker",
      skilled_guesser: "Skilled Guesser",
      code_breaker: "Code Breaker",
      intuition_expert: "Intuition Expert",
      oracle_whisperer: "Oracle Whisperer",
      master_mind: "Master Mind",
      arcade_legend: "Arcade Legend",
      master_tactician: "Master Tactician",
      grandmaster_mind: "Grandmaster Mind",
      arcade_legend_title: "Arcade Sovereign",
      arcade_sovereign: "Arcade Sovereign",
      omniscient_oracle: "Omniscient Oracle",
      living_legend: "Living Legend",
      speed_demon_title: "Speed Demon",
      flawless_hunter: "Flawless Mind",
      champion: "Champion",
    };

    return canonicalMap[titleId] ?? titleId;
  }
}
