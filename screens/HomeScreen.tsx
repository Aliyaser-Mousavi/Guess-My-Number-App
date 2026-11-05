import PlayerAvatar from "@/components/profile/PlayerAvatar";
import InteractiveTutorialModal from "@/components/tutorial/InteractiveTutorialModal";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
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
  onLeaderboard?: () => void;
  onMultiplayer?: () => void;
  onTournaments?: () => void;
  onSeasons?: () => void;
  onAcademy?: () => void;
  onCoach?: () => void;
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
  onLeaderboard,
  onMultiplayer,
  onTournaments,
  onSeasons,
  onAcademy,
  onCoach,
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
    formatNumber,
  } = useGame();

  const [showTutorial, setShowTutorial] = useState(false);

  const winRate =
    stats.gamesPlayed === 0
      ? 0
      : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);

  // Animations: Pulse, Radar Sweep, Floating Shimmer
  const radarRotation = useSharedValue(0);
  const breathAnim = useSharedValue(0);
  const glowPulse = useSharedValue(0.4);

  useEffect(() => {
    // 360 degree continuous radar scan
    radarRotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false,
    );

    // Subtle breath motion
    breathAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );

    // Glow pulse for outer ambient halo
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [radarRotation, breathAnim, glowPulse]);

  const animatedScannerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${radarRotation.value}deg` }],
  }));

  const animatedOrbStyle = useAnimatedStyle(() => {
    const scale = interpolate(breathAnim.value, [0, 1], [0.97, 1.03]);
    return {
      transform: [{ scale }],
    };
  });

  const animatedHaloStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  const xpPercent = Math.min(
    100,
    Math.round(
      (progression.currentXp / Math.max(1, progression.nextLevelXp)) * 100,
    ),
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Header / Player Status Bar */}
          <View style={styles.topBar}>
            {/* Player Quick Identity Pill */}
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onProfile();
              }}
              style={({ pressed }) => [
                styles.identityPill,
                pressed && styles.pressedScale,
              ]}
              accessibilityRole="button"
              accessibilityLabel="View player profile"
            >
              <View style={styles.avatarWrap}>
                <PlayerAvatar avatarId={profile.avatarId} size={36} />
                <View style={styles.levelBadgeMini}>
                  <Text style={styles.levelBadgeMiniText}>
                    {formatNumber(progression.level)}
                  </Text>
                </View>
              </View>
              <View style={styles.identityMeta}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {profile.displayName}
                </Text>
                <View style={styles.tierIndicatorRow}>
                  <Ionicons
                    name={competitiveRank.tierIcon as any}
                    size={11}
                    color={competitiveRank.tierColor}
                  />
                  <Text
                    style={[
                      styles.tierIndicatorText,
                      { color: competitiveRank.tierColor },
                    ]}
                  >
                    {competitiveRank.label} • {formatNumber(competitiveRank.rating)}
                  </Text>
                </View>
              </View>
            </Pressable>

            {/* Quick Utility Icon Actions */}
            <View style={styles.utilityActions}>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onHowTo();
                }}
                accessibilityRole="button"
                accessibilityLabel="How to play guide"
                style={({ pressed }) => [
                  styles.utilityBtn,
                  pressed && styles.pressedScale,
                ]}
              >
                <Ionicons
                  name="help-buoy-outline"
                  size={19}
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
                  styles.utilityBtn,
                  pressed && styles.pressedScale,
                ]}
              >
                <Ionicons
                  name="cog-outline"
                  size={20}
                  color={Colors.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {/* New Player Tutorial Banner */}
          {!settings.tutorialCompleted && stats.gamesPlayed === 0 && (
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                setShowTutorial(true);
              }}
              style={({ pressed }) => [
                styles.tutorialBanner,
                pressed && styles.pressedScale,
              ]}
            >
              <LinearGradient
                colors={["rgba(255, 184, 0, 0.18)", "rgba(255, 184, 0, 0.04)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.tutorialBannerGradient}
              >
                <View style={styles.tutorialBadge}>
                  <Ionicons name="sparkles" size={12} color={Colors.accent} />
                  <Text style={styles.tutorialBadgeText}>RECRUIT PROTOCOL</Text>
                </View>
                <View style={styles.tutorialTextGroup}>
                  <Text style={styles.tutorialTitle}>
                    Interactive Strategy Guide
                  </Text>
                  <Text style={styles.tutorialSub}>
                    Master deduction odds and high-precision guessing
                  </Text>
                </View>
                <Ionicons
                  name="arrow-forward-circle"
                  size={22}
                  color={Colors.accent}
                />
              </LinearGradient>
            </Pressable>
          )}

          {/* HERO SECTION: The Quantum Oracle Chamber */}
          <View style={styles.heroChamber}>
            {/* Ambient Background Glow */}
            <Animated.View style={[styles.ambientHalo, animatedHaloStyle]} />

            {/* Radar / Tactical Coordinate Scanner Ring */}
            <Animated.View
              style={[styles.radarScannerContainer, animatedScannerStyle]}
            >
              <View style={styles.scannerLine} />
              <View style={styles.scannerDot} />
            </Animated.View>

            {/* Concentric Calibration Circles */}
            <View style={styles.concentricRingOuter} />
            <View style={styles.concentricRingMid} />

            {/* Core Animated Oracle Sphere */}
            <Animated.View style={[styles.coreSphereWrap, animatedOrbStyle]}>
              <LinearGradient
                colors={[Colors.surfaceSoft, Colors.bgElevated, Colors.bg]}
                style={styles.coreSphereGradient}
              >
                {/* Top Holographic Specular Shine */}
                <View style={styles.specularShine} />

                {/* Cyber Matrix Crosshairs */}
                <View style={styles.crosshairVertical} />
                <View style={styles.crosshairHorizontal} />

                {/* Central Mystery Glyph with Dynamic Badging */}
                <View style={styles.glyphCenter}>
                  <Ionicons
                    name="telescope-outline"
                    size={28}
                    color={Colors.primary}
                    style={styles.glyphIcon}
                  />
                  <Text style={styles.oracleText}>ORACLE CORE</Text>
                  <View style={styles.chamberStatusBadge}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.livePulseText}>ONLINE</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Chamber HUD Telemetry Labels */}
            <View style={styles.chamberHudLeft}>
              <Text style={styles.hudLabelKey}>SYSTEM</Text>
              <Text style={styles.hudLabelVal}>MARS.NET</Text>
            </View>
            <View style={styles.chamberHudRight}>
              <Text style={styles.hudLabelKey}>PROTOCOL</Text>
              <Text style={styles.hudLabelVal}>HEX-09</Text>
            </View>
          </View>

          {/* Primary Action Button: Massive Cyberpunk Play CTA */}
          <Pressable
            onPress={() => {
              buzz("medium");
              playSound("button_click");
              onPlay();
            }}
            style={({ pressed }) => [
              styles.primaryCtaBtn,
              pressed && styles.primaryCtaPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Play Game Now"
          >
            <LinearGradient
              colors={[Colors.accent, "#E5A000", "#C68200"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryCtaGradient}
            >
              <View style={styles.primaryCtaLeft}>
                <View style={styles.playIconContainer}>
                  <Ionicons name="play" size={24} color={Colors.accent} />
                </View>
                <View>
                  <Text style={styles.primaryCtaHeading}>START GUESSING</Text>
                  <Text style={styles.primaryCtaSub}>
                    Classic • Time Attack • Blitz • Custom
                  </Text>
                </View>
              </View>

              <View style={styles.primaryCtaChevron}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={Colors.bg}
                />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Daily Challenge Card - Neon Pulsing Mission Card */}
          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onDaily();
            }}
            style={({ pressed }) => [
              styles.dailyCard,
              dailyDone && styles.dailyCardDone,
              pressed && styles.pressedScale,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Daily Challenge"
          >
            <LinearGradient
              colors={
                dailyDone
                  ? ["rgba(46, 213, 115, 0.12)", "rgba(46, 213, 115, 0.03)"]
                  : ["rgba(0, 210, 180, 0.16)", "rgba(0, 210, 180, 0.04)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dailyGradient}
            >
              <View
                style={[
                  styles.dailyIconBox,
                  dailyDone && styles.dailyIconBoxDone,
                ]}
              >
                <Ionicons
                  name={dailyDone ? "checkmark-done-circle" : "calendar-sharp"}
                  size={22}
                  color={dailyDone ? Colors.mint : Colors.primary}
                />
              </View>

              <View style={styles.dailyContent}>
                <View style={styles.dailyTagRow}>
                  <Text
                    style={[
                      styles.dailyTag,
                      dailyDone && { color: Colors.mint },
                    ]}
                  >
                    {dailyDone ? "DAILY MISSION COMPLETE" : "GLOBAL DAILY CIPHER"}
                  </Text>
                </View>
                <Text style={styles.dailyTitle}>Daily Challenge</Text>
                <Text style={styles.dailyDescription}>
                  {dailyDone
                    ? "Cipher solved for today • New target in 24h"
                    : "One shared mystery number • Global ranking badge"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={dailyDone ? Colors.mint : Colors.primary}
              />
            </LinearGradient>
          </Pressable>

          {/* Quick HUD Metrics Strip (Level Progress & Snapshot) */}
          <View style={styles.hudMetricsContainer}>
            {/* Progression & XP Progress */}
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onProgression();
              }}
              style={({ pressed }) => [
                styles.hudProgressionCard,
                pressed && styles.pressedScale,
              ]}
            >
              <View style={styles.hudProgressionHeader}>
                <View style={styles.hudLevelTag}>
                  <Ionicons name="trophy" size={13} color={Colors.accent} />
                  <Text style={styles.hudLevelText}>
                    Lv.{formatNumber(progression.level)}
                  </Text>
                </View>
                <Text style={styles.hudXpFraction}>
                  {formatNumber(progression.currentXp)} / {formatNumber(progression.nextLevelXp)} XP
                </Text>
              </View>

              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
            </Pressable>

            {/* Quick 4-Stat Strip */}
            <View style={styles.statsStripGrid}>
              <View style={styles.statStripItem}>
                <Ionicons name="flame" size={15} color={Colors.coral} />
                <Text style={styles.statStripVal}>
                  {formatNumber(stats.currentStreak)}
                </Text>
                <Text style={styles.statStripLabel}>Streak</Text>
              </View>

              <View style={styles.statStripItem}>
                <Ionicons name="ribbon" size={15} color={Colors.accent} />
                <Text style={styles.statStripVal}>
                  {formatNumber(stats.bestScore)}
                </Text>
                <Text style={styles.statStripLabel}>Best Score</Text>
              </View>

              <View style={styles.statStripItem}>
                <Ionicons name="game-controller" size={15} color={Colors.primary} />
                <Text style={styles.statStripVal}>
                  {formatNumber(stats.gamesPlayed)}
                </Text>
                <Text style={styles.statStripLabel}>Played</Text>
              </View>

              <View style={styles.statStripItem}>
                <Ionicons name="trending-up" size={15} color={Colors.mint} />
                <Text style={styles.statStripVal}>{formatNumber(winRate)}%</Text>
                <Text style={styles.statStripLabel}>Win Rate</Text>
              </View>
            </View>
          </View>

          {/* Section: Competitive & Multiplayer Arena */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flash-outline" size={16} color={Colors.primary} />
              <Text style={styles.sectionHeading}>COMPETITIVE ARENA</Text>
            </View>

            <View style={styles.grid2Col}>
              {/* 1v1 Battle */}
              {onMultiplayer && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onMultiplayer();
                  }}
                  style={({ pressed }) => [
                    styles.featureTile,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(0, 210, 180, 0.15)", "rgba(0, 210, 180, 0.02)"]}
                    style={styles.featureTileGradient}
                  >
                    <View style={styles.featureTileTop}>
                      <View
                        style={[
                          styles.tileIconBox,
                          { backgroundColor: "rgba(0, 210, 180, 0.18)" },
                        ]}
                      >
                        <Ionicons name="flash" size={18} color={Colors.primary} />
                      </View>
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    </View>
                    <Text style={styles.tileTitle}>1v1 Battle</Text>
                    <Text style={styles.tileSub}>Real-time PvP Duel</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {/* Tournaments */}
              {onTournaments && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onTournaments();
                  }}
                  style={({ pressed }) => [
                    styles.featureTile,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255, 82, 82, 0.15)", "rgba(255, 82, 82, 0.02)"]}
                    style={styles.featureTileGradient}
                  >
                    <View style={styles.featureTileTop}>
                      <View
                        style={[
                          styles.tileIconBox,
                          { backgroundColor: "rgba(255, 82, 82, 0.18)" },
                        ]}
                      >
                        <Ionicons name="trophy" size={18} color={Colors.coral} />
                      </View>
                      <View style={[styles.liveBadge, { borderColor: Colors.coral }]}>
                        <Text style={[styles.liveBadgeText, { color: Colors.coral }]}>
                          CUP
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tileTitle}>Tournaments</Text>
                    <Text style={styles.tileSub}>Weekly Championship</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {/* Seasons */}
              {onSeasons && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onSeasons();
                  }}
                  style={({ pressed }) => [
                    styles.featureTile,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(168, 85, 247, 0.15)", "rgba(168, 85, 247, 0.02)"]}
                    style={styles.featureTileGradient}
                  >
                    <View style={styles.featureTileTop}>
                      <View
                        style={[
                          styles.tileIconBox,
                          { backgroundColor: "rgba(168, 85, 247, 0.18)" },
                        ]}
                      >
                        <Ionicons name="planet" size={18} color="#A855F7" />
                      </View>
                      <View style={[styles.liveBadge, { borderColor: "#A855F7" }]}>
                        <Text style={[styles.liveBadgeText, { color: "#A855F7" }]}>
                          S1
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tileTitle}>Season 1 Hub</Text>
                    <Text style={styles.tileSub}>Rank Rewards & Passes</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {/* Leaderboard */}
              {onLeaderboard && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onLeaderboard();
                  }}
                  style={({ pressed }) => [
                    styles.featureTile,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(255, 184, 0, 0.15)", "rgba(255, 184, 0, 0.02)"]}
                    style={styles.featureTileGradient}
                  >
                    <View style={styles.featureTileTop}>
                      <View
                        style={[
                          styles.tileIconBox,
                          { backgroundColor: "rgba(255, 184, 0, 0.18)" },
                        ]}
                      >
                        <Ionicons name="podium" size={18} color={Colors.accent} />
                      </View>
                      <View style={[styles.liveBadge, { borderColor: Colors.accent }]}>
                        <Text style={[styles.liveBadgeText, { color: Colors.accent }]}>
                          TOP
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.tileTitle}>Leaderboard</Text>
                    <Text style={styles.tileSub}>Global Standings</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>

          {/* Section: Training & Tactical Mastery */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="hardware-chip-outline" size={16} color={Colors.cyan} />
              <Text style={styles.sectionHeading}>TACTICAL LAB & TRAINING</Text>
            </View>

            <View style={styles.rowCardsContainer}>
              {/* AI Coach */}
              {onCoach && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onCoach();
                  }}
                  style={({ pressed }) => [
                    styles.horizontalNavRow,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <View
                    style={[
                      styles.rowIconCircle,
                      { backgroundColor: "rgba(0, 229, 255, 0.14)" },
                    ]}
                  >
                    <Ionicons
                      name="hardware-chip"
                      size={20}
                      color={Colors.cyan}
                    />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>AI Strategy Coach</Text>
                    <Text style={styles.rowSub}>
                      Algorithmic Diagnostics & Mistake Analysis
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textDim}
                  />
                </Pressable>
              )}

              {/* Number Academy */}
              {onAcademy && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onAcademy();
                  }}
                  style={({ pressed }) => [
                    styles.horizontalNavRow,
                    pressed && styles.pressedScale,
                  ]}
                >
                  <View
                    style={[
                      styles.rowIconCircle,
                      { backgroundColor: "rgba(0, 210, 180, 0.14)" },
                    ]}
                  >
                    <Ionicons name="school" size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Number Academy</Text>
                    <Text style={styles.rowSub}>
                      Interactive Lessons, Binary Search & Drills
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textDim}
                  />
                </Pressable>
              )}

              {/* Badges / Achievements */}
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onAchievements();
                }}
                style={({ pressed }) => [
                  styles.horizontalNavRow,
                  pressed && styles.pressedScale,
                ]}
              >
                <View
                  style={[
                    styles.rowIconCircle,
                    { backgroundColor: "rgba(168, 85, 247, 0.14)" },
                  ]}
                >
                  <Ionicons name="medal" size={20} color="#A855F7" />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Badges & Achievements</Text>
                  <Text style={styles.rowSub}>
                    {formatNumber(stats.unlockedAchievements.length)} / 25 Badges Claimed
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textDim}
                />
              </Pressable>

              {/* Analytics / Full Stats */}
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onStats();
                }}
                style={({ pressed }) => [
                  styles.horizontalNavRow,
                  pressed && styles.pressedScale,
                ]}
              >
                <View
                  style={[
                    styles.rowIconCircle,
                    { backgroundColor: "rgba(255, 184, 0, 0.14)" },
                  ]}
                >
                  <Ionicons name="stats-chart" size={20} color={Colors.accent} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.rowTitle}>Full Lifetime Statistics</Text>
                  <Text style={styles.rowSub}>
                    Guess Distribution, Timers & Win Trends
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textDim}
                />
              </Pressable>
            </View>
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
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  pressedScale: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  /* Top Bar */
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  identityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.bgElevated,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  avatarWrap: {
    position: "relative",
  },
  levelBadgeMini: {
    position: "absolute",
    bottom: -3,
    right: -4,
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  levelBadgeMiniText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    color: Colors.bg,
  },
  identityMeta: {
    paddingRight: 6,
  },
  playerName: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    color: Colors.text,
  },
  tierIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  tierIndicatorText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  utilityActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  utilityBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },

  /* Tutorial Banner */
  tutorialBanner: {
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.4)",
  },
  tutorialBannerGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  tutorialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: Radius.xs,
  },
  tutorialBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  tutorialTextGroup: {
    flex: 1,
  },
  tutorialTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.text,
  },
  tutorialSub: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },

  /* HERO CHAMBER */
  heroChamber: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    height: 240,
    marginVertical: 14,
    paddingVertical: 10,
  },
  ambientHalo: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
  },
  concentricRingOuter: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.2)",
    borderStyle: "dashed",
  },
  concentricRingMid: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.18)",
  },
  radarScannerContainer: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  scannerLine: {
    width: 1,
    height: 95,
    backgroundColor: "rgba(0, 210, 180, 0.6)",
  },
  scannerDot: {
    position: "absolute",
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  coreSphereWrap: {
    width: 122,
    height: 122,
    borderRadius: 61,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 8,
  },
  coreSphereGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  specularShine: {
    position: "absolute",
    top: 6,
    left: 20,
    right: 20,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  crosshairVertical: {
    position: "absolute",
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: "rgba(0, 210, 180, 0.15)",
  },
  crosshairHorizontal: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: "rgba(0, 210, 180, 0.15)",
  },
  glyphCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  glyphIcon: {
    marginBottom: 4,
  },
  oracleText: {
    fontFamily: FontFamily.display,
    fontSize: 10,
    color: Colors.text,
    letterSpacing: 2,
  },
  chamberStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46, 213, 115, 0.18)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  livePulseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.mint,
  },
  livePulseText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 8,
    color: Colors.mint,
    letterSpacing: 0.6,
  },
  chamberHudLeft: {
    position: "absolute",
    left: 12,
    bottom: 12,
  },
  chamberHudRight: {
    position: "absolute",
    right: 12,
    bottom: 12,
    alignItems: "flex-end",
  },
  hudLabelKey: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  hudLabelVal: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    color: Colors.textMuted,
  },

  /* Primary CTA Button */
  primaryCtaBtn: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  primaryCtaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryCtaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCtaHeading: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    color: Colors.bg,
    letterSpacing: 0.8,
  },
  primaryCtaSub: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    color: "rgba(7, 14, 24, 0.75)",
    marginTop: 2,
  },
  primaryCtaChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(7, 14, 24, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* Daily Card */
  dailyCard: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.3)",
    backgroundColor: Colors.surface,
  },
  dailyCardDone: {
    borderColor: "rgba(46, 213, 115, 0.3)",
  },
  dailyGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  dailyIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.25)",
  },
  dailyIconBoxDone: {
    backgroundColor: "rgba(46, 213, 115, 0.12)",
    borderColor: "rgba(46, 213, 115, 0.25)",
  },
  dailyContent: {
    flex: 1,
  },
  dailyTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  dailyTag: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    color: Colors.primary,
    letterSpacing: 1,
  },
  dailyTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 15,
    color: Colors.text,
  },
  dailyDescription: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },

  /* HUD Metrics Card */
  hudMetricsContainer: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  hudProgressionCard: {
    gap: 8,
  },
  hudProgressionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hudLevelTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hudLevelText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12,
    color: Colors.accent,
  },
  hudXpFraction: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  xpTrack: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  statsStripGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statStripItem: {
    alignItems: "center",
    flex: 1,
    gap: 3,
  },
  statStripVal: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    color: Colors.text,
  },
  statStripLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textDim,
  },

  /* Section Blocks */
  sectionBlock: {
    gap: 10,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 2,
  },
  sectionHeading: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1.4,
  },

  /* Grid 2 Column (Competitive Arena) */
  grid2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureTile: {
    width: "48.5%",
    borderRadius: Radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  featureTileGradient: {
    padding: 12,
    minHeight: 96,
    justifyContent: "space-between",
  },
  featureTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  liveBadge: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  liveBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 8,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  tileTitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 13,
    color: Colors.text,
    marginTop: 8,
  },
  tileSub: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textDim,
    marginTop: 1,
  },

  /* Row Cards (Tactical Lab & Training) */
  rowCardsContainer: {
    gap: 8,
  },
  horizontalNavRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  rowIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  rowSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
