// ==============================================================================
// Screen: ProgressionScreen.tsx
// Description: Modernized progression and rank telemetry hub for MarsGuess.
//              Features high-craft Level & XP hero card, competitive rating (CR)
//              rank card with tier styling, glowing tactical Locker banner,
//              daily/weekly mission feeds, and achievement milestones preview.
// ==============================================================================

import CosmeticLockerModal from "@/components/progression/CosmeticLockerModal";
import MissionCard from "@/components/progression/MissionCard";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius, Shadows, Spacing } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AchievementService } from "@/services/achievements/AchievementService";
import { CosmeticsService } from "@/services/cosmetics/CosmeticsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    formatNumber,
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
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Navigation Bar */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.navBtn,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Title size="md">Progression Hub</Title>
            <Text style={styles.headerSubtitle}>XP & Tactical Ranks</Text>
          </View>

          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              setShowLocker(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Open Locker"
            style={({ pressed }) => [
              styles.navBtn,
              styles.lockerNavBtn,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="shirt-outline" size={17} color={Colors.accent} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Hero Level & Hunter XP Card */}
          <View style={styles.heroLevelCard}>
            <LinearGradient
              colors={["rgba(255, 184, 0, 0.14)", "rgba(10, 14, 23, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradientBg}
            />

            <View style={styles.levelCardTop}>
              <View style={styles.levelBadgeGroup}>
                <View style={styles.levelOrbContainer}>
                  <View style={styles.levelOrbHalo} />
                  <View style={styles.levelOrb}>
                    <Text style={styles.levelNum}>{formatNumber(progression.level)}</Text>
                  </View>
                </View>

                <View style={styles.levelInfoTextWrap}>
                  <Text style={styles.levelSubLabel}>HUNTER PROTOCOL</Text>
                  <Text style={styles.rankTitleText}>
                    {progression.rankTitle}
                  </Text>
                </View>
              </View>

              <View style={styles.totalXpPill}>
                <Ionicons name="sparkles" size={12} color={Colors.accent} />
                <Text style={styles.totalXpText}>
                  {formatNumber(progression.totalXp)} XP
                </Text>
              </View>
            </View>

            {/* Level XP Progress Bar */}
            <View style={styles.xpSection}>
              <View style={styles.xpNumbersRow}>
                <View style={styles.xpLabelGroup}>
                  <Ionicons name="trending-up" size={12} color={Colors.accent} />
                  <Text style={styles.xpLabel}>
                    PROGRESS TO LEVEL {formatNumber(progression.level + 1)}
                  </Text>
                </View>
                <Text style={styles.xpFraction}>
                  {formatNumber(progression.currentXp)} /{" "}
                  {formatNumber(progression.nextLevelXp)} XP
                </Text>
              </View>

              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>

              <View style={styles.xpMetaFooter}>
                <Text style={styles.xpRemainingText}>
                  {formatNumber(progression.nextLevelXp - progression.currentXp)} XP to next tier
                </Text>
                <Text style={styles.xpPercentText}>{xpPercent}%</Text>
              </View>
            </View>
          </View>

          {/* Section 2: Competitive Rank Card */}
          <View
            style={[
              styles.heroRankCard,
              { borderColor: `${competitiveRank.tierColor}45` },
            ]}
          >
            <LinearGradient
              colors={[`${competitiveRank.tierColor}16`, "rgba(10, 14, 23, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradientBg}
            />

            <View style={styles.rankTopRow}>
              <View style={styles.rankLeftGroup}>
                <View
                  style={[
                    styles.rankIconCircle,
                    {
                      backgroundColor: `${competitiveRank.tierColor}20`,
                      borderColor: `${competitiveRank.tierColor}40`,
                    },
                  ]}
                >
                  <Ionicons
                    name={competitiveRank.tierIcon as any}
                    size={24}
                    color={competitiveRank.tierColor}
                  />
                </View>
                <View style={styles.rankMetaText}>
                  <Text style={styles.rankTierLabel}>COMPETITIVE STANDING</Text>
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

              <View
                style={[
                  styles.crPill,
                  {
                    borderColor: `${competitiveRank.tierColor}40`,
                    backgroundColor: `${competitiveRank.tierColor}14`,
                  },
                ]}
              >
                <Ionicons name="trophy" size={12} color={competitiveRank.tierColor} />
                <Text
                  style={[
                    styles.crText,
                    { color: competitiveRank.tierColor },
                  ]}
                >
                  {formatNumber(competitiveRank.rating)} CR
                </Text>
              </View>
            </View>

            {/* Progress to next competitive tier */}
            <View style={styles.crProgressSection}>
              <View style={styles.crProgressRow}>
                <Text style={styles.crProgressLabel}>
                  {competitiveRank.tier === "grandmaster"
                    ? "Pinnacle Grandmaster Rank Achieved"
                    : `Next Tier: ${formatNumber(competitiveRank.nextTierRating)} CR Target`}
                </Text>
                <Text
                  style={[
                    styles.crPercentText,
                    { color: competitiveRank.tierColor },
                  ]}
                >
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
          </View>

          {/* Section 3: Overhauled Locker & Customization Banner */}
          <View style={styles.lockerTacticalBanner}>
            <LinearGradient
              colors={["rgba(0, 229, 255, 0.12)", "rgba(10, 14, 23, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cardGradientBg}
            />

            <View style={styles.lockerPreviewLeft}>
              <View style={styles.lockerIconPill}>
                <Ionicons name="sparkles" size={18} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.lockerTitleRow}>
                  <Text style={styles.lockerBannerTitle}>Tactical Locker</Text>
                  <View style={styles.lockerActiveBadge}>
                    <Text style={styles.lockerActiveBadgeText}>ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.lockerBannerSub} numberOfLines={1}>
                  Equipped Title: {CosmeticsService.getTitleName(profile.titleId) ?? "Deduction Operative"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                setShowLocker(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Open Locker"
              style={({ pressed }) => [
                styles.lockerBannerActionBtn,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="shirt-outline" size={14} color={Colors.bg} />
              <Text style={styles.lockerBannerActionBtnText}>Locker</Text>
            </Pressable>
          </View>

          {/* Section 4: Daily Missions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="calendar-outline" size={15} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeader}>DAILY MISSIONS</Text>
                <Text style={styles.sectionSub}>Refreshes every 24 hours</Text>
              </View>
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
          </View>

          {/* Section 5: Weekly Marathon */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="flame-outline" size={15} color={Colors.coral} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeader}>WEEKLY MARATHON</Text>
                <Text style={styles.sectionSub}>Long-term arcade challenges</Text>
              </View>
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
          </View>

          {/* Section 6: Accomplishments & Badges Preview */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="ribbon-outline" size={15} color={Colors.accent} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeader}>ACCOMPLISHMENTS</Text>
                <Text style={styles.sectionSub}>Trophy milestones & badges</Text>
              </View>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onOpenAchievements();
                }}
                style={({ pressed }) => [
                  styles.viewAllPill,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.viewAllText}>
                  View All ({recentAchievements.length})
                </Text>
                <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
              </Pressable>
            </View>

            <View style={styles.achievementsCard}>
              <LinearGradient
                colors={["rgba(255, 184, 0, 0.09)", "rgba(10, 14, 23, 0.95)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradientBg}
              />
              <View style={styles.achRow}>
                <View style={styles.achIconWrap}>
                  <Ionicons name="trophy" size={20} color={Colors.accent} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.achTitle}>Badges & Trophies</Text>
                  <Text style={styles.achSub}>
                    {formatNumber(stats.unlockedAchievements.length)} of 25 Badges Unlocked
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onOpenAchievements();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View badges"
                  style={({ pressed }) => [
                    styles.achActionBtn,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="medal-outline" size={14} color={Colors.accent} />
                  <Text style={styles.achActionBtnText}>Badges</Text>
                </Pressable>
              </View>
            </View>
          </View>
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
  safe: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lockerNavBtn: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderColor: "rgba(255, 184, 0, 0.35)",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.hero,
    gap: Spacing.lg,
  },

  /* Card Gradient Background */
  cardGradientBg: {
    ...StyleSheet.absoluteFill,
  },

  /* Hero Level Card */
  heroLevelCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
    overflow: "hidden",
    position: "relative",
    gap: Spacing.md,
    ...Shadows.glowGold,
  },
  levelCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelBadgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelOrbContainer: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  levelOrbHalo: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 184, 0, 0.2)",
  },
  levelOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  levelNum: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    color: Colors.accent,
  },
  levelInfoTextWrap: {
    gap: 2,
  },
  levelSubLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9.5,
    color: Colors.textDim,
    letterSpacing: 1.2,
  },
  rankTitleText: {
    fontFamily: FontFamily.display,
    fontSize: 16,
    color: Colors.text,
  },
  totalXpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  totalXpText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.accent,
  },
  xpSection: {
    gap: 7,
  },
  xpNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  xpLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9.5,
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  xpFraction: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.text,
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  xpMetaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpRemainingText: {
    fontFamily: FontFamily.sans,
    fontSize: 10.5,
    color: Colors.textDim,
  },
  xpPercentText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10.5,
    color: Colors.accent,
  },

  /* Competitive Rank Card */
  heroRankCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    gap: Spacing.md,
    ...Shadows.sm,
  },
  rankTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rankLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankIconCircle: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rankMetaText: {
    gap: 2,
  },
  rankTierLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9.5,
    color: Colors.textDim,
    letterSpacing: 1.2,
  },
  rankTierName: {
    fontFamily: FontFamily.display,
    fontSize: 18,
  },
  crPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  crText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12,
  },
  crProgressSection: {
    gap: 6,
  },
  crProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  crProgressLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  crPercentText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10.5,
  },
  crTrack: {
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  crFill: {
    height: "100%",
    borderRadius: 3.5,
  },

  /* Tactical Locker Banner */
  lockerTacticalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    overflow: "hidden",
    position: "relative",
    gap: 12,
    ...Shadows.glowTeal,
  },
  lockerPreviewLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  lockerIconPill: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.25)",
  },
  lockerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockerBannerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13.5,
    color: Colors.text,
  },
  lockerActiveBadge: {
    backgroundColor: "rgba(0, 229, 255, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.25)",
  },
  lockerActiveBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 8.5,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  lockerBannerSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  lockerBannerActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  lockerBannerActionBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.bg,
    letterSpacing: 0.3,
  },

  /* Section Containers */
  sectionContainer: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  sectionIconPill: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  sectionHeader: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1.2,
  },
  sectionSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  missionsList: {
    gap: 10,
  },
  viewAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  viewAllText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  achievementsCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
    overflow: "hidden",
    position: "relative",
    ...Shadows.glowGold,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  achIconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
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
  achActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
  },
  achActionBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.accent,
  },
});
