import CosmeticLockerModal from "@/components/progression/CosmeticLockerModal";
import MissionCard from "@/components/progression/MissionCard";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AchievementService } from "@/services/achievements/AchievementService";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
  onOpenAchievements: () => void;
};

export default function ProgressionScreen({
  onBack,
  onOpenAchievements,
}: Props) {
  const {
    progression,
    competitiveRank,
    missions,
    stats,
    history,
    profile,
    claimMission,
    buzz,
    playSound,
  } = useGame();

  const [showLocker, setShowLocker] = useState(false);

  // Separate daily vs weekly missions
  const dailyMissions = useMemo(
    () => missions.filter((m) => m.category === "daily"),
    [missions],
  );
  const weeklyMissions = useMemo(
    () => missions.filter((m) => m.category === "weekly"),
    [missions],
  );

  // Decorated achievements for quick preview
  const recentAchievements = useMemo(() => {
    return AchievementService.getDecoratedAchievements(stats, history).filter(
      (a) => a.unlocked,
    );
  }, [stats, history]);

  // Level XP calculations
  const xpPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (progression.currentXp / Math.max(1, progression.nextLevelXp)) * 100,
      ),
    ),
  );

  function handleClaimMission(missionId: string) {
    buzz("success");
    playSound("victory");
    claimMission(missionId);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                buzz("light");
                onBack();
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.backBtnPressed,
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text} />
            </Pressable>
            <View style={styles.titleWrap}>
              <Title size="lg">Progression</Title>
            </View>
            <Pressable
              onPress={() => {
                buzz("light");
                setShowLocker(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open Locker"
              style={({ pressed }) => [
                styles.lockerIconBtn,
                pressed && styles.backBtnPressed,
              ]}
            >
              <Ionicons name="shirt-outline" size={18} color={Colors.accent} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Level progression, competitive ranks, daily missions & cosmetic locker
          </Text>

          {/* Hero Card: Level & XP Bar */}
          <Card variant="elevated" style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View style={styles.levelBadgeWrap}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelNum}>{progression.level}</Text>
                </View>
                <View>
                  <Text style={styles.levelSubLabel}>HUNTER LEVEL</Text>
                  <Text style={styles.rankTitleText}>
                    {progression.rankTitle}
                  </Text>
                </View>
              </View>

              <View style={styles.totalXpPill}>
                <Ionicons name="sparkles" size={12} color={Colors.accent} />
                <Text style={styles.totalXpText}>
                  {progression.totalXp.toLocaleString()} Total XP
                </Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.xpSection}>
              <View style={styles.xpNumbersRow}>
                <Text style={styles.xpLabel}>PROGRESS TO LEVEL {progression.level + 1}</Text>
                <Text style={styles.xpFraction}>
                  {progression.currentXp.toLocaleString()} /{" "}
                  {progression.nextLevelXp.toLocaleString()} XP
                </Text>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
            </View>
          </Card>

          {/* Competitive Rank Card */}
          <Card variant="elevated" style={styles.rankCard}>
            <View style={styles.rankTopRow}>
              <View style={styles.rankLeft}>
                <View
                  style={[
                    styles.rankIconCircle,
                    { backgroundColor: competitiveRank.tierColor + "22" },
                  ]}
                >
                  <Ionicons
                    name={competitiveRank.tierIcon as any}
                    size={22}
                    color={competitiveRank.tierColor}
                  />
                </View>
                <View>
                  <Text style={styles.rankTierLabel}>COMPETITIVE RANK</Text>
                  <Text
                    style={[
                      styles.rankTierName,
                      { color: competitiveRank.tierColor },
                    ]}
                  >
                    {competitiveRank.label}
                  </Text>
                </View>
              </View>

              <View style={styles.crPill}>
                <Text style={styles.crText}>
                  {competitiveRank.rating} CR
                </Text>
              </View>
            </View>

            {/* Progress to next competitive tier */}
            <View style={styles.crProgressSection}>
              <View style={styles.crProgressRow}>
                <Text style={styles.crProgressLabel}>
                  {competitiveRank.tier === "grandmaster"
                    ? "Pinnacle Grandmaster Rank"
                    : `Next Tier: ${competitiveRank.nextTierRating} CR`}
                </Text>
                <Text style={styles.crPercentText}>
                  {competitiveRank.progressPercent}%
                </Text>
              </View>
              <View style={styles.crTrack}>
                <View
                  style={[
                    styles.crFill,
                    {
                      width: `${competitiveRank.progressPercent}%`,
                      backgroundColor: competitiveRank.tierColor,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>

          {/* Locker & Active Customization Banner */}
          <View style={styles.lockerBanner}>
            <View style={styles.lockerPreviewLeft}>
              <View style={styles.activeAvatarWrap}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.lockerBannerTitle}>Arcade Locker</Text>
                <Text style={styles.lockerBannerSub}>
                  Equipped: {profile.titleId ?? "Apprentice Hunter"}
                </Text>
              </View>
            </View>
            <PrimaryButton
              variant="accent"
              size="sm"
              onPress={() => {
                buzz("light");
                setShowLocker(true);
              }}
              icon={<Ionicons name="shirt-outline" size={14} color={Colors.bg} />}
            >
              Open Locker
            </PrimaryButton>
          </View>

          {/* Daily Missions */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>DAILY MISSIONS</Text>
            <Text style={styles.sectionSub}>Refreshes every 24 hours</Text>
          </View>
          <View style={styles.missionsList}>
            {dailyMissions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                onClaim={handleClaimMission}
              />
            ))}
          </View>

          {/* Weekly Missions */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>WEEKLY MARATHON</Text>
            <Text style={styles.sectionSub}>Refreshes weekly</Text>
          </View>
          <View style={styles.missionsList}>
            {weeklyMissions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                onClaim={handleClaimMission}
              />
            ))}
          </View>

          {/* Achievements Preview */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>ACCOMPLISHMENTS</Text>
            <Pressable onPress={onOpenAchievements}>
              <Text style={styles.viewAllText}>View All ({recentAchievements.length})</Text>
            </Pressable>
          </View>

          <Card variant="default" style={styles.achievementsCard}>
            <View style={styles.achRow}>
              <View style={styles.achIconWrap}>
                <Ionicons name="ribbon" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle}>Badges & Trophies</Text>
                <Text style={styles.achSub}>
                  {stats.unlockedAchievements.length} of 25 Badges Unlocked
                </Text>
              </View>
              <PrimaryButton
                variant="secondary"
                size="sm"
                onPress={onOpenAchievements}
              >
                Badges
              </PrimaryButton>
            </View>
          </Card>
        </ScrollView>

        {/* Cosmetic Locker Modal */}
        <CosmeticLockerModal
          visible={showLocker}
          onClose={() => setShowLocker(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  lockerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  levelCard: {
    padding: 16,
    gap: 14,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  levelNum: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    color: Colors.accent,
  },
  levelSubLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  rankTitleText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 15,
    color: Colors.text,
  },
  totalXpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  totalXpText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  xpSection: {
    gap: 6,
  },
  xpNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  xpFraction: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.text,
    fontWeight: "700",
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  rankCard: {
    padding: 16,
    gap: 12,
  },
  rankTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rankTierLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  rankTierName: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    marginTop: 2,
  },
  crPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  crText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  crProgressSection: {
    gap: 6,
  },
  crProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  crProgressLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  crPercentText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  crTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    overflow: "hidden",
  },
  crFill: {
    height: "100%",
    borderRadius: 3,
  },
  lockerBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.15)",
  },
  lockerPreviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activeAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockerBannerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  lockerBannerSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionHeader: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  sectionSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  missionsList: {
    gap: 10,
  },
  viewAllText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.accent,
  },
  achievementsCard: {
    padding: 14,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  achTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  achSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
