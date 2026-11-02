import PlayerAvatar from "@/components/profile/PlayerAvatar";
import InteractiveTutorialModal from "@/components/tutorial/InteractiveTutorialModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import StatChip from "@/components/ui/StatChip";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { CosmeticsService } from "@/services/cosmetics/CosmeticsService";
import { LocalizationService } from "@/services/localization/LocalizationService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onPlay: () => void;
  onDaily: () => void;
  onStats: () => void;
  onAchievements: () => void;
  onSettings: () => void;
  onHowTo: () => void;
  onProgression: () => void;
  onProfile: () => void;
  dailyDone: boolean;
};

export default function HomeScreen({
  onPlay,
  onDaily,
  onStats,
  onAchievements,
  onSettings,
  onHowTo,
  onProgression,
  onProfile,
  dailyDone,
}: Props) {
  const {
    stats,
    settings,
    progression,
    competitiveRank,
    profile,
    updateSettings,
    buzz,
    playSound,
    t,
    formatNumber,
    isRTL,
  } = useGame();
  const [showTutorial, setShowTutorial] = useState(false);
  const winRate =
    stats.gamesPlayed === 0
      ? 0
      : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);

  // Gentle breathing glow on the hero oracle orb
  const pulseScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.4);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2200 }),
        withTiming(1, { duration: 2200 }),
      ),
      -1,
      true,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2200 }),
        withTiming(0.3, { duration: 2200 }),
      ),
      -1,
      true,
    );
  }, [pulseScale, ringOpacity]);

  const animatedOrbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedRingStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Action Bar */}
          <View style={[styles.topRow, isRTL && styles.rowReverse]}>
            <View style={[styles.badgePill, isRTL && styles.rowReverse]}>
              <Ionicons name="sparkles" size={12} color={Colors.primary} />
              <Text style={styles.badgePillText}>{t("midnight_arcade")}</Text>
            </View>
            <View style={[styles.headerIcons, isRTL && styles.rowReverse]}>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onProfile();
                }}
                accessibilityRole="button"
                accessibilityLabel="Player Profile"
                style={({ pressed }) => [
                  styles.iconBtn,
                  styles.profileIconBtn,
                  pressed && styles.iconBtnPressed,
                ]}
              >
                <PlayerAvatar avatarId={profile.avatarId} size={32} />
              </Pressable>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onHowTo();
                }}
                accessibilityRole="button"
                accessibilityLabel="How to play"
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconBtnPressed,
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onSettings();
                }}
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconBtnPressed,
                ]}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Title size="display" style={styles.brandTitle}>
              {t("app_title")}
            </Title>
            <Text style={styles.tagline}>
              {t("tagline")}
            </Text>
          </View>

          {/* Player Level & Rank Quick Banner */}
          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onProfile();
            }}
            style={({ pressed }) => [
              styles.levelBanner,
              isRTL && styles.rowReverse,
              pressed && styles.levelBannerPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="View player profile and rank"
          >
            <View style={[styles.levelBannerLeft, isRTL && styles.rowReverse]}>
              <PlayerAvatar avatarId={profile.avatarId} size={36} />
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  Lv.{formatNumber(progression.level)}
                </Text>
              </View>
              <View style={[styles.levelTitleWrap, isRTL && { alignItems: "flex-end" }]}>
                <Text style={styles.levelRankTitle}>
                  {profile.displayName} • {CosmeticsService.getTitleName(profile.titleId) ?? progression.rankTitle}
                </Text>
                <View style={[styles.levelXpRow, isRTL && styles.rowReverse]}>
                  <View style={styles.miniXpTrack}>
                    <View
                      style={[
                        styles.miniXpFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.round(
                              (progression.currentXp /
                                Math.max(1, progression.nextLevelXp)) *
                                100,
                            ),
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.miniXpText}>
                    {formatNumber(progression.currentXp)}/{formatNumber(progression.nextLevelXp)} XP
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.rankPill,
                {
                  borderColor: competitiveRank.tierColor + "55",
                  backgroundColor: competitiveRank.tierColor + "15",
                },
                isRTL && styles.rowReverse,
              ]}
            >
              <Ionicons
                name={competitiveRank.tierIcon as any}
                size={12}
                color={competitiveRank.tierColor}
              />
              <Text
                style={[
                  styles.rankPillText,
                  { color: competitiveRank.tierColor },
                ]}
              >
                {competitiveRank.label}
              </Text>
            </View>
          </Pressable>

          {/* Hero Oracle Element */}
          <View style={styles.heroWrapper}>
            <Animated.View style={[styles.heroOuterRing, animatedRingStyle]} />
            <Animated.View style={[styles.heroOrb, animatedOrbStyle]}>
              <View style={styles.orbInnerGlow} />
              <Text style={styles.heroNumber}>?</Text>
            </Animated.View>
          </View>

          {/* Primary Action Button (Play Now) */}
          <View style={styles.actionsContainer}>
            {!settings.tutorialCompleted && stats.gamesPlayed === 0 && (
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  setShowTutorial(true);
                }}
                style={styles.tutorialPrompt}
              >
                <View style={styles.tutorialPromptBadge}>
                  <Ionicons name="sparkles" size={13} color={Colors.accent} />
                  <Text style={styles.tutorialPromptBadgeText}>NEW HUNTER?</Text>
                </View>
                <Text style={styles.tutorialPromptText}>
                  Take the Interactive Tutorial & Strategy Walkthrough
                </Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
              </Pressable>
            )}

            <PrimaryButton
              onPress={() => {
                playSound("button_click");
                onPlay();
              }}
              variant="accent"
              size="lg"
              icon={<Ionicons name="play" size={20} color={Colors.bg} />}
            >
              {t("play_now")}
            </PrimaryButton>

            {/* Daily Challenge Action */}
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onDaily();
              }}
              style={({ pressed }) => [
                styles.dailyCard,
                isRTL && styles.rowReverse,
                dailyDone && styles.dailyCardDone,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
            >
              <View style={[styles.dailyLeft, isRTL && styles.rowReverse]}>
                <View
                  style={[
                    styles.dailyIconWrap,
                    dailyDone && styles.dailyIconWrapDone,
                  ]}
                >
                  <Ionicons
                    name={dailyDone ? "checkmark-circle" : "calendar"}
                    size={18}
                    color={dailyDone ? Colors.mint : Colors.primary}
                  />
                </View>
                <View style={isRTL && { alignItems: "flex-end" }}>
                  <Text style={styles.dailyTitle}>{t("daily_challenge")}</Text>
                  <Text style={styles.dailySubtitle}>
                    {dailyDone
                      ? t("daily_completed")
                      : t("daily_available")}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={18}
                color={Colors.textDim}
              />
            </Pressable>
          </View>

          {/* Quick Player Statistics Grid */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionHeader, isRTL && { textAlign: "right" }]}>
              {t("player_snapshot")}
            </Text>
            <View style={styles.statsGrid}>
              <StatChip
                icon="flame"
                label={t("streak")}
                value={formatNumber(stats.currentStreak)}
                color={Colors.coral}
              />
              <StatChip
                icon="trophy"
                label={t("best_score")}
                value={formatNumber(stats.bestScore)}
                color={Colors.accent}
              />
              <StatChip
                icon="game-controller"
                label={t("played")}
                value={formatNumber(stats.gamesPlayed)}
                color={Colors.primary}
              />
              <StatChip
                icon="stats-chart"
                label={t("win_rate")}
                value={`${formatNumber(winRate)}%`}
                color={Colors.mint}
              />
            </View>
          </View>

          {/* Secondary Hub Navigation */}
          <View style={styles.navRow}>
            {/* Player Profile Link */}
            <Pressable
              style={({ pressed }) => [
                styles.navCard,
                isRTL && styles.rowReverse,
                pressed && styles.navCardPressed,
              ]}
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onProfile();
              }}
            >
              <View
                style={[
                  styles.navIconContainer,
                  { backgroundColor: "rgba(0, 210, 180, 0.12)" },
                ]}
              >
                <PlayerAvatar avatarId={profile.avatarId} size={28} />
              </View>
              <View style={[styles.navTextContainer, isRTL && { alignItems: "flex-end" }]}>
                <Text style={styles.navLabel}>{t("profile")}</Text>
                <Text style={styles.navMeta}>
                  {profile.displayName} • {CosmeticsService.getTitleName(profile.titleId) ?? progression.rankTitle}
                </Text>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={16}
                color={Colors.textDim}
              />
            </Pressable>

            {/* Progression & Missions */}
            <Pressable
              style={({ pressed }) => [
                styles.navCard,
                isRTL && styles.rowReverse,
                pressed && styles.navCardPressed,
              ]}
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onProgression();
              }}
            >
              <View
                style={[
                  styles.navIconContainer,
                  { backgroundColor: "rgba(255, 184, 0, 0.12)" },
                ]}
              >
                <Ionicons name="trophy" size={20} color={Colors.accent} />
              </View>
              <View style={[styles.navTextContainer, isRTL && { alignItems: "flex-end" }]}>
                <Text style={styles.navLabel}>{t("progression_hub")}</Text>
                <Text style={styles.navMeta}>
                  Lv. {formatNumber(progression.level)} • {competitiveRank.label}
                </Text>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={16}
                color={Colors.textDim}
              />
            </Pressable>

            {/* Full Stats */}
            <Pressable
              style={({ pressed }) => [
                styles.navCard,
                isRTL && styles.rowReverse,
                pressed && styles.navCardPressed,
              ]}
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onStats();
              }}
            >
              <View style={styles.navIconContainer}>
                <Ionicons name="bar-chart" size={20} color={Colors.primary} />
              </View>
              <View style={[styles.navTextContainer, isRTL && { alignItems: "flex-end" }]}>
                <Text style={styles.navLabel}>{t("full_stats")}</Text>
                <Text style={styles.navMeta}>{t("lifetime_analytics")}</Text>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={16}
                color={Colors.textDim}
              />
            </Pressable>

            {/* Badges */}
            <Pressable
              style={({ pressed }) => [
                styles.navCard,
                isRTL && styles.rowReverse,
                pressed && styles.navCardPressed,
              ]}
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onAchievements();
              }}
            >
              <View
                style={[
                  styles.navIconContainer,
                  { backgroundColor: "rgba(168, 85, 247, 0.12)" },
                ]}
              >
                <Ionicons name="ribbon" size={20} color="#a855f7" />
              </View>
              <View style={[styles.navTextContainer, isRTL && { alignItems: "flex-end" }]}>
                <Text style={styles.navLabel}>{t("badges")}</Text>
                <Text style={styles.navMeta}>
                  {formatNumber(stats.unlockedAchievements.length)} / {formatNumber(25)} Unlocked
                </Text>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={16}
                color={Colors.textDim}
              />
            </Pressable>
          </View>
        </ScrollView>

        {/* Interactive Tutorial Modal */}
        <InteractiveTutorialModal
          visible={showTutorial}
          onClose={() => setShowTutorial(false)}
          onFinish={() => {
            setShowTutorial(false);
            updateSettings({ tutorialCompleted: true });
          }}
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
    paddingBottom: 36,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0, 210, 180, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.25)",
  },
  badgePillText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.borderStrong,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandTitle: {
    color: Colors.text,
    textAlign: "center",
  },
  tagline: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
    fontSize: 14,
    paddingHorizontal: 12,
  },
  heroWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    height: 140,
  },
  heroOuterRing: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  heroOrb: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  orbInnerGlow: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentGlow,
  },
  heroNumber: {
    fontFamily: FontFamily.display,
    fontSize: 56,
    lineHeight: 62,
    color: Colors.accent,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  tutorialPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
    gap: 8,
  },
  tutorialPromptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.xs,
  },
  tutorialPromptBadgeText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 9,
    letterSpacing: 1,
  },
  tutorialPromptText: {
    flex: 1,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.text,
    fontSize: 11,
  },
  dailyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  dailyCardDone: {
    borderColor: "rgba(46, 213, 115, 0.3)",
    backgroundColor: "rgba(46, 213, 115, 0.05)",
  },
  dailyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dailyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyIconWrapDone: {
    backgroundColor: "rgba(46, 213, 115, 0.15)",
  },
  dailyTitle: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 14,
  },
  dailySubtitle: {
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  statsSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
    paddingLeft: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navRow: {
    gap: 10,
    marginTop: 4,
  },
  navCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  navCardPressed: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.borderStrong,
  },
  navIconContainer: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTextContainer: {
    flex: 1,
  },
  navLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 14,
  },
  navMeta: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  levelBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
    marginBottom: 6,
  },
  levelBannerPressed: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.accent,
  },
  levelBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  levelBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.35)",
  },
  levelBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.accent,
  },
  levelTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  levelRankTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  levelXpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  miniXpTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  miniXpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  miniXpText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
  },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  rankPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: "700",
  },
  profileIconBtn: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
