import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import type { MissionProgress } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  mission: MissionProgress;
  onClaim: (missionId: string) => void;
};

export default function MissionCard({ mission, onClaim }: Props) {
  const [now] = useState(() => Date.now());

  // Format expiration countdown
  const timeRemaining = useMemo(() => {
    const diffMs = mission.expiresAt - now;
    if (diffMs <= 0) return "Expiring soon";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 24) {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Resets in ${hours}h ${minutes}m`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Resets in ${days}d ${remHours}h`;
  }, [mission.expiresAt, now]);

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((mission.current / Math.max(1, mission.target)) * 100)),
  );

  return (
    <Card
      variant={mission.completed && !mission.claimed ? "elevated" : "default"}
      style={[
        styles.card,
        mission.completed && !mission.claimed && styles.cardClaimable,
      ]}
    >
      {/* Top Meta Bar */}
      <View style={styles.topRow}>
        <View style={styles.categoryWrap}>
          <View
            style={[
              styles.categoryPill,
              mission.category === "daily"
                ? styles.pillDaily
                : styles.pillWeekly,
            ]}
          >
            <Text
              style={[
                styles.categoryText,
                mission.category === "daily"
                  ? styles.textDaily
                  : styles.textWeekly,
              ]}
            >
              {mission.category.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.timerText}>{timeRemaining}</Text>
        </View>

        {/* Reward Badge */}
        <View style={styles.rewardBadge}>
          <Ionicons name="sparkles" size={11} color={Colors.accent} />
          <Text style={styles.rewardText}>+{mission.reward.xp} XP</Text>
        </View>
      </View>

      {/* Main Title & Description */}
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconCircle,
            mission.completed && styles.iconCircleCompleted,
          ]}
        >
          <Ionicons
            name={(mission.icon ?? "trophy") as any}
            size={18}
            color={mission.completed ? Colors.mint : Colors.textMuted}
          />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.titleText}>{mission.title}</Text>
          <Text style={styles.descText}>{mission.description}</Text>
        </View>
      </View>

      {/* Progress Bar & Target Numbers */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
              mission.completed && styles.progressFillCompleted,
            ]}
          />
        </View>
        <Text style={styles.progressFraction}>
          {mission.current} / {mission.target}
        </Text>
      </View>

      {/* Claim / Status Action Footer */}
      <View style={styles.footerRow}>
        {mission.claimed ? (
          <View style={styles.claimedWrap}>
            <Ionicons name="checkmark-done" size={14} color={Colors.mint} />
            <Text style={styles.claimedText}>Reward Claimed</Text>
          </View>
        ) : mission.completed ? (
          <Pressable
            onPress={() => onClaim(mission.id)}
            style={({ pressed }) => [
              styles.claimBtn,
              pressed && styles.claimBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Claim reward for ${mission.title}`}
          >
            <Ionicons name="gift" size={14} color={Colors.bg} />
            <Text style={styles.claimBtnText}>Claim Reward</Text>
          </Pressable>
        ) : (
          <View style={styles.inProgressWrap}>
            <Ionicons name="hourglass-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.inProgressText}>In Progress</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 10,
  },
  cardClaimable: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.05)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  pillDaily: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  pillWeekly: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  categoryText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: "700",
  },
  textDaily: {
    color: Colors.accent,
  },
  textWeekly: {
    color: Colors.primary,
  },
  timerText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  rewardBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.2)",
  },
  rewardText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    fontWeight: "700",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  descText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  progressFillCompleted: {
    backgroundColor: Colors.mint,
  },
  progressFraction: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    minWidth: 40,
    textAlign: "right",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 8,
  },
  claimedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  claimedText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.mint,
  },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.sm,
  },
  claimBtnPressed: {
    opacity: 0.7,
  },
  claimBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.bg,
  },
  inProgressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inProgressText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
});
