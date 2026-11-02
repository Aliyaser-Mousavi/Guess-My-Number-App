import Card from "@/components/ui/Card";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AchievementService } from "@/services/achievements/AchievementService";
import type { AchievementTier } from "@/types/game";
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

type FilterTier = "all" | AchievementTier | "secret";

const TIER_COLORS: Record<AchievementTier, string> = {
  common: "#94A3B8",
  rare: "#38BDF8",
  epic: "#A855F7",
  legendary: Colors.accent,
};

export default function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const { stats, history, buzz } = useGame();
  const [filter, setFilter] = useState<FilterTier>("all");

  // Get decorated achievements
  const allAchievements = useMemo(() => {
    return AchievementService.getDecoratedAchievements(stats, history);
  }, [stats, history]);

  const unlockedCount = allAchievements.filter((a) => a.unlocked).length;
  const totalCount = allAchievements.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Filter achievements
  const filtered = useMemo(() => {
    if (filter === "all") return allAchievements;
    if (filter === "secret") return allAchievements.filter((a) => a.isSecret);
    return allAchievements.filter((a) => a.tier === filter);
  }, [allAchievements, filter]);

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
              <Title size="lg">Badges & Trophies</Title>
            </View>
            <View style={{ width: 42 }} />
          </View>

          {/* Progress Header Card */}
          <Card variant="elevated" style={styles.progressCard}>
            <View style={styles.progressTop}>
              <View>
                <Text style={styles.progressTitle}>ACCOMPLISHMENTS</Text>
                <Text style={styles.progressCount}>
                  {unlockedCount} of {totalCount} Badges Unlocked
                </Text>
              </View>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>{progressPercent}%</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(progressPercent, 4)}%` },
                ]}
              />
            </View>
          </Card>

          {/* Filter Chips Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {(["all", "common", "rare", "epic", "legendary", "secret"] as const).map(
              (t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    buzz("light");
                    setFilter(t);
                  }}
                  style={[
                    styles.filterChip,
                    filter === t && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filter === t && styles.filterChipTextActive,
                    ]}
                  >
                    {t === "all"
                      ? "All Badges"
                      : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ),
            )}
          </ScrollView>

          {/* Achievements List */}
          <View style={styles.list}>
            {filtered.map((a) => {
              const isOn = a.unlocked;
              const isSecretLocked = a.isSecret && !isOn;
              const tierColor = TIER_COLORS[a.tier] ?? Colors.primary;

              return (
                <View
                  key={a.id}
                  style={[
                    styles.achievementCard,
                    isOn ? styles.cardUnlocked : styles.cardLocked,
                  ]}
                >
                  {/* Icon */}
                  <View
                    style={[
                      styles.iconWrap,
                      isOn ? styles.iconWrapUnlocked : styles.iconWrapLocked,
                      isOn && { borderColor: tierColor + "55" },
                    ]}
                  >
                    <Ionicons
                      name={
                        isOn
                          ? (a.icon as any)
                          : isSecretLocked
                          ? "help"
                          : "lock-closed"
                      }
                      size={20}
                      color={
                        isOn
                          ? tierColor
                          : isSecretLocked
                          ? Colors.accent
                          : Colors.textDim
                      }
                    />
                  </View>

                  {/* Text Container */}
                  <View style={styles.textContainer}>
                    <View style={styles.cardTopLine}>
                      <Text
                        style={[
                          styles.achievementTitle,
                          !isOn && styles.titleLocked,
                        ]}
                      >
                        {isSecretLocked ? "???" : a.title}
                      </Text>

                      {/* Tier Pill */}
                      <View
                        style={[
                          styles.tierPill,
                          {
                            borderColor: tierColor + "44",
                            backgroundColor: tierColor + "15",
                          },
                        ]}
                      >
                        <Text style={[styles.tierPillText, { color: tierColor }]}>
                          {a.tier.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.achievementDesc}>
                      {isSecretLocked
                        ? a.secretHint ?? "Secret achievement. Discover by playing!"
                        : a.description}
                    </Text>

                    {/* Multi-stage or Target Progress Bar */}
                    {a.maxProgress && a.maxProgress > 1 && (
                      <View style={styles.progressRow}>
                        <View style={styles.itemProgressTrack}>
                          <View
                            style={[
                              styles.itemProgressFill,
                              {
                                width: `${Math.min(
                                  100,
                                  Math.round(
                                    (a.currentProgress / a.maxProgress) * 100,
                                  ),
                                )}%`,
                                backgroundColor: isOn
                                  ? Colors.mint
                                  : tierColor,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.itemProgressFraction}>
                          {a.currentProgress} / {a.maxProgress}
                        </Text>
                      </View>
                    )}

                    {/* Stage indicator & Rewards */}
                    <View style={styles.metaRow}>
                      {a.stage && a.maxStage && (
                        <Text style={styles.stageText}>
                          Stage {a.stage} of {a.maxStage}
                        </Text>
                      )}
                      <View style={styles.rewardTag}>
                        <Ionicons name="sparkles" size={10} color={Colors.accent} />
                        <Text style={styles.rewardTagText}>+{a.rewardXp} XP</Text>
                      </View>
                    </View>
                  </View>

                  {/* Status Indicator */}
                  {isOn ? (
                    <View style={styles.statusBadge}>
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={Colors.mint}
                      />
                    </View>
                  ) : (
                    <View style={styles.lockedBadge}>
                      <Text style={styles.lockedText}>LOCKED</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
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
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnPressed: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.borderStrong,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  progressCard: {
    marginTop: 12,
    marginBottom: 14,
    padding: 16,
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressTitle: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  progressCount: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 20,
    marginTop: 2,
  },
  percentBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  percentText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 13,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterChipActive: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.accent,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 12,
  },
  cardUnlocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderStrong,
  },
  cardLocked: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    opacity: 0.65,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconWrapUnlocked: {
    backgroundColor: "rgba(255, 184, 0, 0.12)",
  },
  iconWrapLocked: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  textContainer: {
    flex: 1,
  },
  cardTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  achievementTitle: {
    fontFamily: FontFamily.displayMedium,
    color: Colors.text,
    fontSize: 14,
    flex: 1,
  },
  titleLocked: {
    color: Colors.textMuted,
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  tierPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    fontWeight: "700",
  },
  achievementDesc: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  itemProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 2,
    overflow: "hidden",
  },
  itemProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  itemProgressFraction: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  stageText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
  rewardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 184, 0, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  rewardTagText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.accent,
    fontWeight: "700",
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockedBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  lockedText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 9,
    letterSpacing: 0.5,
  },
});
