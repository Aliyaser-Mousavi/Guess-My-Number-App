// ==============================================================================
// Screen: ProfileScreen.tsx
// Description: Modernized player profile and telemetry hub for MarsGuess.
//              Features high-craft identity hero with glowing avatar, account sync
//              management, statistical telemetry grid, personal records breakdown,
//              showcase badge pedestal, and an overhauled tactical Locker snapshot.
// ==============================================================================

import AuthModal from "@/components/auth/AuthModal";
import EditProfileModal from "@/components/profile/EditProfileModal";
import PlayerAvatar from "@/components/profile/PlayerAvatar";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import { useSync } from "@/context/SyncProvider";
import { EXPANDED_ACHIEVEMENTS } from "@/services/achievements/AchievementService";
import { CosmeticsService } from "@/services/cosmetics/CosmeticsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
  onOpenProgression: () => void;
  onOpenBadges: () => void;
};

export default function ProfileScreen({
  onBack,
  onOpenProgression,
  onOpenBadges,
}: Props) {
  const {
    profile,
    progression,
    competitiveRank,
    stats,
    personalBests,
    cosmetics,
    buzz,
    playSound,
    formatNumber,
  } = useGame();
  const { user, isGuest, dbProfile, signOut } = useAuth();
  const {
    syncStatus,
    lastSyncedAt,
    pendingCount,
    failedCount,
    manualSync,
    retryFailed,
  } = useSync();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const winRate =
    stats.gamesPlayed === 0
      ? 0
      : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);

  const xpPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (progression.currentXp / Math.max(1, progression.nextLevelXp)) * 100,
      ),
    ),
  );

  // Showcase badges
  const showcasedBadges = useMemo(() => {
    const list = profile.showcaseAchievements ?? [];
    return list
      .map((id) => EXPANDED_ACHIEVEMENTS.find((a) => a.id === id))
      .filter((a): a is (typeof EXPANDED_ACHIEVEMENTS)[0] => a != null);
  }, [profile.showcaseAchievements]);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Navigation Header */}
        <View style={styles.topBar}>
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
            <Title size="md">Player Profile</Title>
            <Text style={styles.headerSubtitle}>Hunter Dossier</Text>
          </View>

          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              setShowEditModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit Profile"
            style={({ pressed }) => [
              styles.navBtn,
              styles.editProfileBtn,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="pencil" size={17} color={Colors.accent} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Hero Identity Card */}
          <View style={styles.heroIdentityCard}>
            <LinearGradient
              colors={["rgba(0, 229, 255, 0.12)", "rgba(10, 14, 23, 0.9)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradientBg}
            />

            <View style={styles.identityRow}>
              {/* Avatar Chamber */}
              <View style={styles.avatarChamber}>
                <View style={styles.avatarGlowHalo} />
                <PlayerAvatar avatarId={profile.avatarId} size={76} showGlow />
                <View style={styles.levelTagBadge}>
                  <Text style={styles.levelTagText}>
                    Lv.{formatNumber(progression.level)}
                  </Text>
                </View>
              </View>

              {/* Name & Competitive Rank Meta */}
              <View style={styles.identityMeta}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {profile.displayName}
                </Text>

                {/* Title Badge */}
                <View style={styles.titleBadge}>
                  <Ionicons name="sparkles" size={12} color={Colors.accent} />
                  <Text style={styles.titleBadgeText} numberOfLines={1}>
                    {CosmeticsService.getTitleName(profile.titleId) ??
                      progression.rankTitle}
                  </Text>
                </View>

                {/* Competitive Rank Pill */}
                <View
                  style={[
                    styles.rankPill,
                    {
                      borderColor: `${competitiveRank.tierColor}60`,
                      backgroundColor: `${competitiveRank.tierColor}16`,
                    },
                  ]}
                >
                  <Ionicons
                    name={competitiveRank.tierIcon as any}
                    size={14}
                    color={competitiveRank.tierColor}
                  />
                  <Text
                    style={[
                      styles.rankPillText,
                      { color: competitiveRank.tierColor },
                    ]}
                  >
                    {competitiveRank.label} •{" "}
                    {formatNumber(competitiveRank.rating)} CR
                  </Text>
                </View>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpSection}>
              <View style={styles.xpHeaderRow}>
                <View style={styles.xpTitleGroup}>
                  <Ionicons
                    name="trending-up"
                    size={13}
                    color={Colors.primary}
                  />
                  <Text style={styles.xpLabel}>
                    Hunter Level {formatNumber(progression.level)}
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
            </View>
          </View>

          {/* Section 2: Account & Cloud Sync Status */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name={
                    isGuest
                      ? "cloud-offline-outline"
                      : "shield-checkmark-outline"
                  }
                  size={16}
                  color={isGuest ? Colors.textDim : Colors.mint}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>CLOUD TELEMETRY</Text>
                <Text style={styles.sectionSubtext}>
                  Authentication & cross-device backup status
                </Text>
              </View>
            </View>

            <View style={styles.surfaceCard}>
              <View style={styles.accountCardHeader}>
                <View
                  style={[
                    styles.accountBadge,
                    !isGuest && styles.accountBadgeVerified,
                  ]}
                >
                  <Ionicons
                    name={isGuest ? "cloud-offline" : "shield-checkmark"}
                    size={13}
                    color={isGuest ? Colors.textMuted : Colors.mint}
                  />
                  <Text
                    style={[
                      styles.accountBadgeText,
                      !isGuest && { color: Colors.mint },
                    ]}
                  >
                    {isGuest ? "GUEST MODE (OFFLINE)" : "VERIFIED HUNTER"}
                  </Text>
                </View>
                <Text style={styles.accountCardSub} numberOfLines={1}>
                  {isGuest
                    ? "Local storage only"
                    : (user?.email ?? "Cloud Synced")}
                </Text>
              </View>

              {isGuest ? (
                <>
                  <Text style={styles.accountDesc}>
                    Link your local progress to an official Hunter profile.
                    Claim your unique callsign and sync match records across
                    multiple devices.
                  </Text>
                  {pendingCount > 0 && (
                    <View style={styles.guestPendingRow}>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={15}
                        color={Colors.accent}
                      />
                      <Text style={styles.guestPendingText}>
                        {pendingCount} match record
                        {pendingCount === 1 ? "" : "s"} stored locally. Connect
                        an account to sync rewards!
                      </Text>
                    </View>
                  )}
                  <View style={styles.accountActionRow}>
                    <PrimaryButton
                      variant="accent"
                      size="sm"
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        setShowAuthModal(true);
                      }}
                      icon={
                        <Ionicons
                          name="log-in-outline"
                          size={16}
                          color={Colors.bg}
                        />
                      }
                    >
                      Connect / Sign In
                    </PrimaryButton>
                  </View>
                </>
              ) : (
                <>
                  {/* Callsign Handle & Sign Out Row */}
                  <View style={styles.accountAuthCard}>
                    <View style={styles.accountIdentityCol}>
                      <Text style={styles.accountMetaKey}>CALLSIGN HANDLE</Text>
                      <Text style={styles.accountMetaVal}>
                        @{dbProfile?.username ?? "hunter"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={async () => {
                        buzz("light");
                        playSound("button_click");
                        await signOut();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Sign out of account"
                      style={({ pressed }) => [
                        styles.accountSignOutBtn,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons
                        name="log-out-outline"
                        size={14}
                        color={Colors.textMuted}
                      />
                      <Text style={styles.accountSignOutBtnText}>Sign Out</Text>
                    </Pressable>
                  </View>

                  <View style={styles.subDivider} />

                  {/* Cloud Sync Telemetry & Manual Sync Row */}
                  <View style={styles.syncCard}>
                    <View style={styles.syncStatusWrap}>
                      <View style={styles.syncBadgeRow}>
                        <Ionicons
                          name={
                            syncStatus === "syncing"
                              ? "sync"
                              : syncStatus === "up_to_date"
                                ? "checkmark-circle"
                                : syncStatus === "pending"
                                  ? "cloud-upload"
                                  : syncStatus === "offline"
                                    ? "cloud-offline"
                                    : syncStatus === "failed"
                                      ? "alert-circle"
                                      : "cloud-done"
                          }
                          size={15}
                          color={
                            syncStatus === "up_to_date"
                              ? Colors.mint
                              : syncStatus === "syncing"
                                ? Colors.primary
                                : syncStatus === "pending"
                                  ? Colors.accent
                                  : syncStatus === "failed"
                                    ? Colors.coral
                                    : Colors.textMuted
                          }
                        />
                        <Text
                          style={[
                            styles.syncBadgeLabel,
                            {
                              color:
                                syncStatus === "up_to_date"
                                  ? Colors.mint
                                  : syncStatus === "syncing"
                                    ? Colors.primary
                                    : syncStatus === "pending"
                                      ? Colors.accent
                                      : syncStatus === "failed"
                                        ? Colors.coral
                                        : Colors.textMuted,
                            },
                          ]}
                        >
                          {syncStatus === "syncing"
                            ? "SYNCING TELEMETRY..."
                            : syncStatus === "up_to_date"
                              ? "CLOUD SYNCHRONIZED"
                              : syncStatus === "pending"
                                ? `${pendingCount} PENDING UPLOAD${pendingCount === 1 ? "" : "S"}`
                                : syncStatus === "offline"
                                  ? "OFFLINE (QUEUED)"
                                  : syncStatus === "failed"
                                    ? "SYNC FAILED (RETRY)"
                                    : "CLOUD BACKUP READY"}
                        </Text>
                      </View>
                      <Text style={styles.syncLastTime}>
                        {syncStatus === "syncing"
                          ? "Uploading match records & stats..."
                          : `Last synced: ${formatLastSynced(lastSyncedAt)}`}
                      </Text>
                    </View>

                    <Pressable
                      disabled={isSyncingManual || syncStatus === "syncing"}
                      onPress={async () => {
                        buzz("light");
                        playSound("button_click");
                        setIsSyncingManual(true);
                        try {
                          await manualSync();
                        } finally {
                          setIsSyncingManual(false);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Synchronize game progress with cloud"
                      style={({ pressed }) => [
                        styles.syncActionBtn,
                        (isSyncingManual || syncStatus === "syncing") &&
                          styles.syncActionBtnDisabled,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons
                        name="sync-outline"
                        size={14}
                        color={
                          isSyncingManual || syncStatus === "syncing"
                            ? Colors.textDim
                            : Colors.bg
                        }
                      />
                      <Text
                        style={[
                          styles.syncActionBtnText,
                          (isSyncingManual || syncStatus === "syncing") &&
                            styles.syncActionBtnTextDisabled,
                        ]}
                      >
                        {isSyncingManual || syncStatus === "syncing"
                          ? "Syncing"
                          : "Sync Now"}
                      </Text>
                    </Pressable>
                  </View>

                  {failedCount > 0 && (
                    <View style={styles.failedRow}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={15}
                        color={Colors.coral}
                      />
                      <Text style={styles.failedText}>
                        {failedCount} upload{failedCount === 1 ? "" : "s"}{" "}
                        failed permanently.
                      </Text>
                      <Pressable
                        onPress={async () => {
                          buzz("light");
                          playSound("button_click");
                          await retryFailed();
                        }}
                        style={styles.retryLink}
                      >
                        <Text style={styles.retryLinkText}>Retry</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Section 3: Performance Telemetry Grid */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="bar-chart-outline"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>COMBAT TELEMETRY</Text>
                <Text style={styles.sectionSubtext}>
                  Core match statistics and win rates
                </Text>
              </View>
            </View>

            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryTile}>
                <View
                  style={[
                    styles.telemetryIconWrap,
                    { backgroundColor: "rgba(255, 184, 0, 0.12)" },
                  ]}
                >
                  <Ionicons name="trophy" size={18} color={Colors.accent} />
                </View>
                <Text style={styles.telemetryVal}>
                  {formatNumber(stats.bestScore)}
                </Text>
                <Text style={styles.telemetryLabel}>Best Score</Text>
              </View>

              <View style={styles.telemetryTile}>
                <View
                  style={[
                    styles.telemetryIconWrap,
                    { backgroundColor: "rgba(255, 71, 87, 0.12)" },
                  ]}
                >
                  <Ionicons name="flame" size={18} color={Colors.coral} />
                </View>
                <Text style={styles.telemetryVal}>
                  {formatNumber(stats.currentStreak)}
                </Text>
                <Text style={styles.telemetryLabel}>Current Streak</Text>
              </View>

              <View style={styles.telemetryTile}>
                <View
                  style={[
                    styles.telemetryIconWrap,
                    { backgroundColor: "rgba(0, 229, 255, 0.12)" },
                  ]}
                >
                  <Ionicons
                    name="game-controller"
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.telemetryVal}>
                  {formatNumber(stats.gamesPlayed)}
                </Text>
                <Text style={styles.telemetryLabel}>Matches Played</Text>
              </View>

              <View style={styles.telemetryTile}>
                <View
                  style={[
                    styles.telemetryIconWrap,
                    { backgroundColor: "rgba(61, 220, 151, 0.12)" },
                  ]}
                >
                  <Ionicons name="stats-chart" size={18} color={Colors.mint} />
                </View>
                <Text style={styles.telemetryVal}>
                  {formatNumber(winRate)}%
                </Text>
                <Text style={styles.telemetryLabel}>Win Rate</Text>
              </View>
            </View>
          </View>

          {/* Section 4: Personal Bests Breakdown */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="ribbon-outline"
                  size={16}
                  color={Colors.accent}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>HALL OF RECORDS</Text>
                <Text style={styles.sectionSubtext}>
                  All-time personal milestones & best runs
                </Text>
              </View>
            </View>

            <View style={styles.surfaceCard}>
              <View style={styles.recordsList}>
                <RecordRow
                  label="Lowest Guesses to Win"
                  value={
                    personalBests.lowestGuesses != null
                      ? `${formatNumber(personalBests.lowestGuesses)} Rounds`
                      : "—"
                  }
                  icon="layers-outline"
                  accentColor={Colors.primary}
                />
                <RecordRow
                  label="Fastest Deduction"
                  value={
                    personalBests.fastestWinMs != null
                      ? `${formatNumber((personalBests.fastestWinMs / 1000).toFixed(1))}s`
                      : "—"
                  }
                  icon="stopwatch-outline"
                  accentColor={Colors.accent}
                />
                <RecordRow
                  label="Best Survival Run"
                  value={
                    personalBests.bestSurvivalRounds > 0
                      ? `Level ${formatNumber(personalBests.bestSurvivalRounds)}`
                      : "—"
                  }
                  icon="shield-checkmark-outline"
                  accentColor={Colors.mint}
                />
                <RecordRow
                  label="Best Blitz Solved"
                  value={
                    personalBests.bestBlitzSolved > 0
                      ? `${formatNumber(personalBests.bestBlitzSolved)} Numbers`
                      : "—"
                  }
                  icon="flash-outline"
                  accentColor={Colors.coral}
                />
              </View>
            </View>
          </View>

          {/* Section 5: Showcase Badges Pedestal */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons
                  name="trophy-outline"
                  size={16}
                  color={Colors.accent}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>SHOWCASE BADGES</Text>
                <Text style={styles.sectionSubtext}>
                  Featured milestones pinned to your dossier
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  setShowEditModal(true);
                }}
                style={({ pressed }) => [
                  styles.badgeEditPill,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="create-outline"
                  size={13}
                  color={Colors.accent}
                />
                <Text style={styles.badgeEditPillText}>
                  {showcasedBadges.length > 0 ? "Edit" : "Pin"}
                </Text>
              </Pressable>
            </View>

            {showcasedBadges.length === 0 ? (
              <Pressable
                onPress={() => {
                  buzz("light");
                  setShowEditModal(true);
                }}
                style={({ pressed }) => [
                  styles.emptyShowcaseBox,
                  pressed && styles.buttonPressed,
                ]}
              >
                <View style={styles.emptyShowcaseIconWrap}>
                  <Ionicons
                    name="ribbon-outline"
                    size={24}
                    color={Colors.textDim}
                  />
                </View>
                <Text style={styles.emptyShowcaseTitle}>
                  No Featured Badges Pinned
                </Text>
                <Text style={styles.emptyShowcaseText}>
                  Tap here to select and display your proudest achievements!
                </Text>
              </Pressable>
            ) : (
              <View style={styles.showcaseGrid}>
                {showcasedBadges.map((badge) => (
                  <View key={badge.id} style={styles.showcaseBadgeCard}>
                    <View style={styles.showcaseIconWrap}>
                      <Ionicons
                        name={(badge.icon as any) ?? "trophy"}
                        size={22}
                        color={Colors.accent}
                      />
                    </View>
                    <Text style={styles.showcaseBadgeTitle} numberOfLines={1}>
                      {badge.title}
                    </Text>
                    <View style={styles.showcaseTierBadge}>
                      <Text style={styles.showcaseTierText}>
                        {badge.tier.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section 6: Overhauled Tactical Locker & Inventory Card */}
          <View style={styles.lockerMasterCard}>
            <LinearGradient
              colors={[
                "rgba(0, 229, 255, 0.14)",
                "rgba(255, 184, 0, 0.08)",
                "rgba(10, 14, 23, 0.95)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.lockerGradientBg}
            />

            <View style={styles.lockerHeaderRow}>
              <View style={styles.lockerIconBadge}>
                <Ionicons name="cube" size={20} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.lockerHeading}>
                  TACTICAL LOCKER & VAULT
                </Text>
                <Text style={styles.lockerSubtext}>
                  Equipped customizations & unlocked inventory
                </Text>
              </View>
            </View>

            {/* Inventory Count Bento Pills */}
            <View style={styles.lockerPillsGrid}>
              <View style={styles.lockerPill}>
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color={Colors.primary}
                />
                <View>
                  <Text style={styles.lockerPillCount}>
                    {formatNumber(cosmetics.unlockedAvatars.length)}
                  </Text>
                  <Text style={styles.lockerPillLabel}>Avatars</Text>
                </View>
              </View>

              <View style={styles.lockerPill}>
                <Ionicons
                  name="color-palette-outline"
                  size={16}
                  color={Colors.accent}
                />
                <View>
                  <Text style={styles.lockerPillCount}>
                    {formatNumber(cosmetics.unlockedThemes.length)}
                  </Text>
                  <Text style={styles.lockerPillLabel}>Themes</Text>
                </View>
              </View>

              <View style={styles.lockerPill}>
                <Ionicons
                  name="sparkles-outline"
                  size={16}
                  color={Colors.mint}
                />
                <View>
                  <Text style={styles.lockerPillCount}>
                    {formatNumber(cosmetics.unlockedNumberStyles.length)}
                  </Text>
                  <Text style={styles.lockerPillLabel}>Styles</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons: Progression / Locker & All Badges */}
            <View style={styles.lockerActionRow}>
              <PrimaryButton
                variant="accent"
                size="sm"
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onOpenProgression();
                }}
                style={styles.flex1}
                icon={
                  <Ionicons name="shirt-outline" size={17} color={Colors.bg} />
                }
              >
                OPEN LOCKER
              </PrimaryButton>

              <PrimaryButton
                variant="secondary"
                size="sm"
                onPress={() => {
                  buzz("light");
                  playSound("button_click");
                  onOpenBadges();
                }}
                style={styles.flex1}
                icon={
                  <Ionicons
                    name="medal-outline"
                    size={17}
                    color={Colors.text}
                  />
                }
              >
                VIEW BADGES
              </PrimaryButton>
            </View>
          </View>
        </ScrollView>

        {/* Modals */}
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
        />

        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function formatLastSynced(isoStr: string | null): string {
  if (!isoStr) return "Never synced";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "Recently";
  }
}

function RecordRow({
  label,
  value,
  icon,
  accentColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}) {
  return (
    <View style={styles.recordRow}>
      <View style={styles.recordRowLeft}>
        <View
          style={[
            styles.recordIconPill,
            {
              backgroundColor: `${accentColor}18`,
              borderColor: `${accentColor}35`,
            },
          ]}
        >
          <Ionicons name={icon} size={15} color={accentColor} />
        </View>
        <Text style={styles.recordLabel}>{label}</Text>
      </View>
      <Text style={styles.recordValue}>{value}</Text>
    </View>
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
  topBar: {
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
  editProfileBtn: {
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
  sectionHeading: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1.2,
  },
  sectionSubtext: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  surfaceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadows.sm,
  },
  subDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 2,
  },

  /* Hero Identity Card */
  heroIdentityCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    overflow: "hidden",
    position: "relative",
    gap: Spacing.md,
    ...Shadows.glowTeal,
  },
  heroGradientBg: {
    ...StyleSheet.absoluteFill,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  avatarChamber: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlowHalo: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(0, 229, 255, 0.12)",
  },
  levelTagBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  levelTagText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    color: Colors.accent,
  },
  identityMeta: {
    flex: 1,
    gap: 6,
  },
  playerName: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  titleBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  rankPillText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
  },
  xpSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  xpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  xpLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10.5,
    color: Colors.textMuted,
  },
  xpFraction: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.text,
  },
  xpTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },

  /* Account Card Specifics */
  accountCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  accountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountBadgeVerified: {
    backgroundColor: "rgba(46, 213, 115, 0.12)",
    borderColor: "rgba(46, 213, 115, 0.3)",
  },
  accountBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9.5,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  accountCardSub: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    textAlign: "right",
  },
  accountDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  accountActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  /* Account & Callsign Row */
  accountAuthCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  accountIdentityCol: {
    flex: 1,
    gap: 2,
  },
  accountMetaKey: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1.2,
  },
  accountMetaVal: {
    fontFamily: FontFamily.monoBold,
    fontSize: 14,
    color: Colors.accent,
  },
  accountSignOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountSignOutBtnText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.textMuted,
  },

  /* Cloud Sync Status & Action */
  syncCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  syncStatusWrap: {
    flex: 1,
    gap: 3,
  },
  syncBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncBadgeLabel: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  syncLastTime: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  syncActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  syncActionBtnDisabled: {
    backgroundColor: Colors.surfaceHighlight,
    shadowOpacity: 0,
    elevation: 0,
  },
  syncActionBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  syncActionBtnTextDisabled: {
    color: Colors.textDim,
  },
  guestPendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  guestPendingText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.accent,
    flex: 1,
  },
  failedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 82, 82, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.2)",
  },
  failedText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.coral,
    flex: 1,
  },
  retryLink: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 82, 82, 0.2)",
  },
  retryLinkText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 10,
    color: Colors.coral,
  },

  /* Performance Telemetry Grid */
  telemetryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  telemetryTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  telemetryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  telemetryVal: {
    fontFamily: FontFamily.monoBold,
    fontSize: 15,
    color: Colors.text,
  },
  telemetryLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
    color: Colors.textDim,
    textAlign: "center",
  },

  /* Records Breakdown */
  recordsList: {
    gap: 10,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recordRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recordIconPill: {
    width: 28,
    height: 28,
    borderRadius: Radius.xs,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  recordLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
  recordValue: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
    color: Colors.text,
  },

  /* Showcase Badges */
  badgeEditPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  badgeEditPillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  emptyShowcaseBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    gap: 6,
  },
  emptyShowcaseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyShowcaseTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  emptyShowcaseText: {
    fontFamily: FontFamily.sans,
    fontSize: 11.5,
    color: Colors.textDim,
    textAlign: "center",
    maxWidth: 240,
  },
  showcaseGrid: {
    flexDirection: "row",
    gap: 10,
  },
  showcaseBadgeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
    gap: 4,
    ...Shadows.glowGold,
  },
  showcaseIconWrap: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  showcaseBadgeTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  showcaseTierBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  showcaseTierText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 0.8,
  },

  /* Overhauled Tactical Locker Card */
  lockerMasterCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderAccent,
    overflow: "hidden",
    position: "relative",
    gap: Spacing.md,
    ...Shadows.glowTeal,
  },
  lockerGradientBg: {
    ...StyleSheet.absoluteFill,
  },
  lockerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.35)",
  },
  lockerHeading: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12,
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  lockerSubtext: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  lockerPillsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  lockerPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lockerPillCount: {
    fontFamily: FontFamily.monoBold,
    fontSize: 13,
    color: Colors.text,
  },
  lockerPillLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 10,
    color: Colors.textDim,
  },
  lockerActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
});
