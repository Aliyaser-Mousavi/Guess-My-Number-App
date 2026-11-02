import AuthModal from "@/components/auth/AuthModal";
import EditProfileModal from "@/components/profile/EditProfileModal";
import PlayerAvatar from "@/components/profile/PlayerAvatar";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import StatChip from "@/components/ui/StatChip";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import { EXPANDED_ACHIEVEMENTS } from "@/services/achievements/AchievementService";
import { CosmeticsService } from "@/services/cosmetics/CosmeticsService";
import { LocalizationService } from "@/services/localization/LocalizationService";
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
    settings,
    buzz,
    playSound,
    t,
    formatNumber,
    isRTL,
  } = useGame();
  const { user, isGuest, dbProfile, signOut } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View style={[styles.topBar, isRTL && styles.rowReverse]}>
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                onBack();
              }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={LocalizationService.getArrowBack(settings.language)}
                size={20}
                color={Colors.text}
              />
            </Pressable>

            <Title size="lg">{t("profile")}</Title>

            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                setShowEditModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
              style={({ pressed }) => [
                styles.iconBtn,
                styles.editBtn,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="pencil" size={18} color={Colors.accent} />
            </Pressable>
          </View>

          {/* Profile Identity Card */}
          <Card variant="elevated" style={styles.identityCard}>
            <View style={[styles.identityRow, isRTL && styles.rowReverse]}>
              <View style={styles.avatarContainer}>
                <PlayerAvatar
                  avatarId={profile.avatarId}
                  size={76}
                  showGlow
                />
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>
                    Lv.{formatNumber(progression.level)}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.identityInfo,
                  { alignItems: isRTL ? "flex-end" : "flex-start" },
                ]}
              >
                <Text style={styles.playerName}>{profile.displayName}</Text>

                <View style={styles.titleBadge}>
                  <Ionicons name="sparkles" size={12} color={Colors.accent} />
                  <Text style={styles.titleBadgeText}>
                    {CosmeticsService.getTitleName(profile.titleId) ?? progression.rankTitle}
                  </Text>
                </View>

                {/* Competitive Rank Badge */}
                <View
                  style={[
                    styles.rankPill,
                    {
                      borderColor: competitiveRank.tierColor + "66",
                      backgroundColor: competitiveRank.tierColor + "18",
                    },
                    isRTL && styles.rowReverse,
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
                    {competitiveRank.label} • {formatNumber(competitiveRank.rating)} CR
                  </Text>
                </View>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={styles.xpSection}>
              <View
                style={[
                  styles.xpHeaderRow,
                  isRTL && styles.rowReverse,
                ]}
              >
                <Text style={styles.xpLabel}>
                  {t("player_level")} {formatNumber(progression.level)}
                </Text>
                <Text style={styles.xpFraction}>
                  {formatNumber(progression.currentXp)} /{" "}
                  {formatNumber(progression.nextLevelXp)} XP
                </Text>
              </View>
              <View style={styles.xpTrack}>
                <View
                  style={[
                    styles.xpFill,
                    { width: `${xpPercent}%` },
                  ]}
                />
              </View>
            </View>
          </Card>

          {/* Account & Online Identity Card */}
          <Card variant="default" style={styles.accountCard}>
            <View style={[styles.accountCardHeader, isRTL && styles.rowReverse]}>
              <View
                style={[
                  styles.accountBadge,
                  !isGuest && styles.accountBadgeVerified,
                  isRTL && styles.rowReverse,
                ]}
              >
                <Ionicons
                  name={isGuest ? "cloud-offline" : "shield-checkmark"}
                  size={14}
                  color={isGuest ? Colors.textMuted : Colors.mint}
                />
                <Text
                  style={[
                    styles.accountBadgeText,
                    !isGuest && { color: Colors.mint },
                  ]}
                >
                  {isGuest ? "GUEST PLAYER (OFFLINE)" : "VERIFIED HUNTER"}
                </Text>
              </View>
              <Text style={styles.accountCardSub} numberOfLines={1}>
                {isGuest ? "Local progress" : (user?.email ?? "Cloud Synced")}
              </Text>
            </View>

            {isGuest ? (
              <>
                <Text style={[styles.accountDesc, isRTL && { textAlign: "right" }]}>
                  Link your local progress to a Hunter account. Claim your unique
                  username and prepare for cloud backup across devices!
                </Text>
                <View style={[styles.accountActionRow, isRTL && styles.rowReverse]}>
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
                    Sign In / Register
                  </PrimaryButton>
                </View>
              </>
            ) : (
              <View style={[styles.accountAuthBody, isRTL && styles.rowReverse]}>
                <View style={[styles.accountInfoCol, isRTL && { alignItems: "flex-end" }]}>
                  <Text style={styles.accountMetaKey}>ACCOUNT HANDLE</Text>
                  <Text style={styles.accountMetaVal}>
                    @{dbProfile?.username ?? "hunter"}
                  </Text>
                </View>
                <PrimaryButton
                  variant="secondary"
                  size="sm"
                  onPress={async () => {
                    buzz("light");
                    playSound("button_click");
                    await signOut();
                  }}
                  icon={
                    <Ionicons
                      name="log-out-outline"
                      size={16}
                      color={Colors.text}
                    />
                  }
                >
                  Sign Out
                </PrimaryButton>
              </View>
            )}
          </Card>

          {/* Quick Statistics Snapshot */}
          <View style={styles.sectionWrap}>
            <Text
              style={[
                styles.sectionTitle,
                { textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t("player_snapshot")}
            </Text>
            <View style={styles.statsGrid}>
              <StatChip
                icon="trophy"
                label={t("best_score")}
                value={formatNumber(stats.bestScore)}
                color={Colors.accent}
              />
              <StatChip
                icon="flame"
                label={t("streak")}
                value={formatNumber(stats.currentStreak)}
                color={Colors.coral}
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

          {/* Personal Records Breakdown */}
          <Card variant="default" style={styles.recordsCard}>
            <View
              style={[
                styles.recordsHeader,
                isRTL && styles.rowReverse,
              ]}
            >
              <View style={[styles.recordsHeaderLeft, isRTL && styles.rowReverse]}>
                <Ionicons name="ribbon" size={16} color={Colors.accent} />
                <Text style={styles.recordsTitle}>PERSONAL BESTS</Text>
              </View>
              <Text style={styles.recordsSub}>Lifetime Records</Text>
            </View>

            <View style={styles.recordsList}>
              <RecordRow
                label="Lowest Guesses to Win"
                value={
                  personalBests.lowestGuesses != null
                    ? `${formatNumber(personalBests.lowestGuesses)} Rounds`
                    : "—"
                }
                icon="layers-outline"
                isRTL={isRTL}
              />
              <RecordRow
                label="Fastest Deduction"
                value={
                  personalBests.fastestWinMs != null
                    ? `${formatNumber((personalBests.fastestWinMs / 1000).toFixed(1))}s`
                    : "—"
                }
                icon="stopwatch-outline"
                isRTL={isRTL}
              />
              <RecordRow
                label="Best Survival Run"
                value={
                  personalBests.bestSurvivalRounds > 0
                    ? `Level ${formatNumber(personalBests.bestSurvivalRounds)}`
                    : "—"
                }
                icon="shield-checkmark-outline"
                isRTL={isRTL}
              />
              <RecordRow
                label="Best Blitz Solved"
                value={
                  personalBests.bestBlitzSolved > 0
                    ? `${formatNumber(personalBests.bestBlitzSolved)} Numbers`
                    : "—"
                }
                icon="flash-outline"
                isRTL={isRTL}
              />
            </View>
          </Card>

          {/* Showcase Badges Section */}
          <View style={styles.sectionWrap}>
            <View
              style={[
                styles.sectionHeaderRow,
                isRTL && styles.rowReverse,
              ]}
            >
              <Text style={styles.sectionTitle}>{t("showcase")}</Text>
              <Pressable
                onPress={() => {
                  buzz("light");
                  setShowEditModal(true);
                }}
              >
                <Text style={styles.editActionText}>
                  {showcasedBadges.length > 0 ? "Edit Showcase" : "+ Select"}
                </Text>
              </Pressable>
            </View>

            {showcasedBadges.length === 0 ? (
              <Pressable
                onPress={() => setShowEditModal(true)}
                style={styles.emptyShowcaseBox}
              >
                <Ionicons
                  name="ribbon-outline"
                  size={24}
                  color={Colors.textDim}
                />
                <Text style={styles.emptyShowcaseText}>
                  Tap here to feature your proudest achievement badges!
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
                    <Text style={styles.showcaseBadgeTier}>
                      {badge.tier.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Locker & Inventory Snapshot */}
          <Card variant="default" style={styles.lockerCard}>
            <View
              style={[
                styles.lockerCardRow,
                isRTL && styles.rowReverse,
              ]}
            >
              <View style={styles.lockerIconWrap}>
                <Ionicons name="shirt" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.lockerCardTitle,
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t("unlocked_items")}
                </Text>
                <Text
                  style={[
                    styles.lockerCardSub,
                    { textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {cosmetics.unlockedAvatars.length} Avatars •{" "}
                  {cosmetics.unlockedThemes.length} Themes •{" "}
                  {cosmetics.unlockedNumberStyles.length} Styles
                </Text>
              </View>
              <PrimaryButton
                variant="accent"
                size="sm"
                onPress={onOpenProgression}
              >
                Locker
              </PrimaryButton>
            </View>
          </Card>
        </ScrollView>

        {/* Edit Profile Modal */}
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
        />

        {/* Auth Modal */}
        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function RecordRow({
  label,
  value,
  icon,
  isRTL,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  isRTL: boolean;
}) {
  return (
    <View style={[styles.recordRow, isRTL && styles.rowReverse]}>
      <View style={[styles.recordRowLeft, isRTL && styles.rowReverse]}>
        <Ionicons name={icon} size={16} color={Colors.textMuted} />
        <Text style={styles.recordLabel}>{label}</Text>
      </View>
      <Text style={styles.recordValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtn: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    borderColor: "rgba(255, 184, 0, 0.35)",
  },
  pressed: {
    opacity: 0.6,
  },
  identityCard: {
    padding: 18,
    gap: 16,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  levelTag: {
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
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    fontWeight: "700",
  },
  identityInfo: {
    flex: 1,
    gap: 5,
  },
  playerName: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    color: Colors.text,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  titleBadgeText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 11,
    color: Colors.accent,
  },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  rankPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    fontWeight: "700",
  },
  xpSection: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  xpHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  xpLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  editActionText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.accent,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recordsCard: {
    padding: 16,
    gap: 12,
  },
  recordsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 8,
  },
  recordsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordsTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1,
    fontWeight: "700",
  },
  recordsSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  recordsList: {
    gap: 10,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  recordValue: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
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
  },
  showcaseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  showcaseBadgeTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.text,
    textAlign: "center",
  },
  showcaseBadgeTier: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.accent,
    letterSpacing: 1,
  },
  emptyShowcaseBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    gap: 8,
  },
  emptyShowcaseText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  lockerCard: {
    padding: 14,
  },
  lockerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockerCardTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  lockerCardSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  accountCard: {
    padding: 16,
    gap: 12,
  },
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
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: "700",
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
    lineHeight: 17,
  },
  accountActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  accountAuthBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  accountInfoCol: {
    flex: 1,
    gap: 2,
  },
  accountMetaKey: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  accountMetaVal: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    color: Colors.accent,
    fontWeight: "700",
  },
});

