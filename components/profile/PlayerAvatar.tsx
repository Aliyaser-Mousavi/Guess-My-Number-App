import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

export type AvatarMetadata = {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
  isDefault?: boolean;
  requiredLevel?: number;
  requiredRank?: string;
  requiredAchievement?: string;
};

export const AVATAR_CATALOG: AvatarMetadata[] = [
  {
    id: "oracle_orb",
    name: "Oracle Orb",
    description: "Classic mystic energy orb of the Number Oracle",
    icon: "eye",
    color: "#00D2B4",
    bgColor: "rgba(0, 210, 180, 0.15)",
    borderColor: "#00D2B4",
    isDefault: true,
  },
  {
    id: "arcade_star",
    name: "Arcade Star",
    description: "Retro arcade champion insignia",
    icon: "star",
    color: "#FFB800",
    bgColor: "rgba(255, 184, 0, 0.15)",
    borderColor: "#FFB800",
    isDefault: true,
  },
  {
    id: "cyber_crown",
    name: "Cyber Crown",
    description: "Sovereign royalty of the digital arena",
    icon: "trophy",
    color: "#a855f7",
    bgColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "#a855f7",
    isDefault: true,
  },
  {
    id: "neon_fox",
    name: "Neon Fox",
    description: "Agile, cunning hunter of numbers",
    icon: "flame",
    color: "#FF5252",
    bgColor: "rgba(255, 82, 82, 0.15)",
    borderColor: "#FF5252",
    isDefault: true,
  },
  {
    id: "phoenix_core",
    name: "Phoenix Core",
    description: "Solar fire born from persistence and comeback victories",
    icon: "sunny",
    color: "#FF7675",
    bgColor: "rgba(255, 118, 117, 0.15)",
    borderColor: "#FF7675",
    requiredLevel: 5,
  },
  {
    id: "master_mind",
    name: "Master Mind",
    description: "Neural matrix of pure deduction",
    icon: "bulb",
    color: "#00E5FF",
    bgColor: "rgba(0, 229, 255, 0.15)",
    borderColor: "#00E5FF",
    requiredRank: "Gold",
  },
  {
    id: "time_phantom",
    name: "Time Phantom",
    description: "Master of split-second speed and lightning rounds",
    icon: "stopwatch",
    color: "#2ED573",
    bgColor: "rgba(46, 213, 115, 0.15)",
    borderColor: "#2ED573",
    requiredAchievement: "speed_demon",
  },
  {
    id: "golden_oracle",
    name: "Golden Sovereign",
    description: "Radiant deity of absolute calculation",
    icon: "sparkles",
    color: "#FFD700",
    bgColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "#FFD700",
    requiredAchievement: "games_25",
  },
  {
    id: "cosmic_vortex",
    name: "Cosmic Vortex",
    description: "Spiral nebula containing boundless numerical constants",
    icon: "planet",
    color: "#70A1FF",
    bgColor: "rgba(112, 161, 255, 0.15)",
    borderColor: "#70A1FF",
    requiredLevel: 10,
  },
  {
    id: "pixel_bot",
    name: "Pixel Bot",
    description: "Synthetic intelligence tuned for binary deduction",
    icon: "hardware-chip",
    color: "#A6FF00",
    bgColor: "rgba(166, 255, 0, 0.15)",
    borderColor: "#A6FF00",
    requiredLevel: 15,
  },
];

type Props = {
  avatarId: string;
  size?: number;
  showGlow?: boolean;
};

export default function PlayerAvatar({
  avatarId,
  size = 54,
  showGlow = false,
}: Props) {
  const meta =
    AVATAR_CATALOG.find((a) => a.id === avatarId) ?? AVATAR_CATALOG[0];

  const iconSize = Math.round(size * 0.48);
  const borderRadius = Math.round(size / 2);

  return (
    <View
      style={[
        styles.avatarWrap,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: meta.bgColor,
          borderColor: meta.borderColor,
          shadowColor: showGlow ? meta.color : "transparent",
        },
      ]}
    >
      <Ionicons name={meta.icon} size={iconSize} color={meta.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
});
