// ==============================================================================
// Screen: SeasonsScreen.tsx
// Description: Global Competitive Seasons, Tier Progression Ladder, Soft-Reset
//              Information, and Data-Driven Seasonal Event Challenges.
// ==============================================================================

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import {
  SeasonsService,
  type SeasonInfo,
  type PlayerSeasonStats,
  type SeasonalEventInfo,
} from "@/services/seasons/SeasonsService";
import { TIER_METADATA } from "@/services/competitive/CompetitiveRatingService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
  onPlayEvent?: (event: SeasonalEventInfo) => void;
};

type SubTab = "season" | "events";

export default function SeasonsScreen({ onBack, onPlayEvent }: Props) {
  const { user } = useAuth();
  const { buzz, playSound, competitiveRank, isRTL } = useGame();

  const [tab, setTab] = useState<SubTab>("season");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [seasonStats, setSeasonStats] = useState<PlayerSeasonStats | null>(null);
  const [events, setEvents] = useState<SeasonalEventInfo[]>([]);

  const userId = user?.id;

  const loadSeasonData = useCallback(async () => {
    try {
      const activeSeason = await SeasonsService.fetchActiveSeason();
      let stats: PlayerSeasonStats | null = null;
      if (activeSeason && userId) {
        stats = await SeasonsService.fetchPlayerSeasonStats(activeSeason.id, userId);
      }
      const activeEvents = await SeasonsService.fetchActiveEvents();
      return { activeSeason, stats, activeEvents };
    } catch {
      return { activeSeason: null, stats: null, activeEvents: [] };
    }
  }, [userId]);

  useEffect(() => {
    let ignore = false;
    loadSeasonData().then(({ activeSeason, stats, activeEvents }) => {
      if (!ignore) {
        setSeason(activeSeason);
        setSeasonStats(stats);
        setEvents(activeEvents);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadSeasonData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { activeSeason, stats, activeEvents } = await loadSeasonData();
    setSeason(activeSeason);
    setSeasonStats(stats);
    setEvents(activeEvents);
    setRefreshing(false);
  }, [loadSeasonData]);

  const seasonEndsAt = season?.endsAt;
  const remainingDays = React.useMemo(() => {
    if (!seasonEndsAt) return null;
    const diff = new Date(seasonEndsAt).getTime() - new Date().getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [seasonEndsAt]);

  const tierLadder = [
    { key: "grandmaster", label: "Grandmaster", minCr: 2000, reward: "GM Season Frame + 2500 XP" },
    { key: "master", label: "Master", minCr: 1800, reward: "Master Badge + 1500 XP" },
    { key: "diamond", label: "Diamond", minCr: 1600, reward: "Diamond Badge + 1000 XP" },
    { key: "platinum", label: "Platinum", minCr: 1400, reward: "Platinum Title + 600 XP" },
    { key: "gold", label: "Gold", minCr: 1200, reward: "Gold Title + 400 XP" },
    { key: "silver", label: "Silver", minCr: 1000, reward: "Silver Avatar + 200 XP" },
    { key: "bronze", label: "Bronze", minCr: 0, reward: "100 XP" },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Title style={styles.title}>COMPETITIVE SEASONS</Title>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, tab === "season" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("season");
            }}
          >
            <Ionicons
              name="trophy"
              size={16}
              color={tab === "season" ? Colors.accent : Colors.textDim}
            />
            <Text style={[styles.tabBtnText, tab === "season" && styles.tabBtnTextActive]}>
              Season 1 Hub
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === "events" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("events");
            }}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={tab === "events" ? Colors.primary : Colors.textDim}
            />
            <Text style={[styles.tabBtnText, tab === "events" && styles.tabBtnTextActive]}>
              Seasonal Events ({events.length})
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
          >
            {tab === "season" ? (
              <View>
                {/* Season Theme Banner */}
                <Card style={styles.seasonBanner}>
                  <View style={styles.seasonBadge}>
                    <Ionicons name="planet" size={16} color={Colors.primary} />
                    <Text style={styles.seasonBadgeText}>CURRENT ACTIVE SEASON</Text>
                  </View>
                  <Text style={styles.seasonTitle}>{season?.title || "Season 1: Neon Genesis"}</Text>
                  <Text style={styles.seasonTheme}>Theme: {season?.theme || "Cyber Grid"}</Text>
                  <Text style={styles.seasonDates}>
                    {remainingDays != null ? `Ends in ${remainingDays} days` : "Active Season"}
                  </Text>
                </Card>

                {/* Player Season Performance */}
                <Card style={styles.statsCard}>
                  <Text style={styles.cardHeader}>YOUR SEASON STATS</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>PEAK RATING</Text>
                      <Text style={styles.statVal}>
                        {seasonStats?.peakRating ?? competitiveRank.rating} CR
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>PEAK TIER</Text>
                      <Text style={styles.statVal}>
                        {(seasonStats?.peakTier ?? competitiveRank.tier).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>RECORD (W/L)</Text>
                      <Text style={styles.statVal}>
                        {seasonStats?.rankedWins ?? 0}W / {seasonStats?.rankedLosses ?? 0}L
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Tier Progression Ladder */}
                <Text style={styles.sectionHeader}>SEASON TIER LADDER</Text>
                <View style={styles.ladderList}>
                  {tierLadder.map((tier) => {
                    const meta = TIER_METADATA[tier.key as keyof typeof TIER_METADATA];
                    const isCurrentTier = (competitiveRank.tier || "bronze").toLowerCase() === tier.key;

                    return (
                      <Card
                        key={tier.key}
                        style={[
                          styles.tierCard,
                          isCurrentTier && styles.currentTierCard,
                        ]}
                      >
                        <View style={styles.tierLeft}>
                          <View
                            style={[
                              styles.tierIconWrap,
                              { backgroundColor: `${meta?.color || Colors.primary}20` },
                            ]}
                          >
                            <Ionicons
                              name="shield"
                              size={20}
                              color={meta?.color || Colors.primary}
                            />
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.tierName,
                                { color: meta?.color || Colors.text },
                              ]}
                            >
                              {tier.label} {isCurrentTier ? "(YOU)" : ""}
                            </Text>
                            <Text style={styles.tierRequirement}>
                              {tier.minCr > 0 ? `${tier.minCr}+ CR` : "Default Tier"}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.tierReward}>
                          <Text style={styles.rewardLabel}>REWARD</Text>
                          <Text style={styles.rewardVal}>{tier.reward}</Text>
                        </View>
                      </Card>
                    );
                  })}
                </View>

                {/* Soft Reset Notice */}
                <Card style={styles.resetCard}>
                  <View style={styles.resetHeader}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
                    <Text style={styles.resetTitle}>Season Soft-Reset Mechanics</Text>
                  </View>
                  <Text style={styles.resetDesc}>
                    At the end of each season, competitive ratings undergo a soft reset towards 1200 CR via formula: New CR = round((Current CR - 1200) * 0.5 + 1200). Season peak tier rewards are automatically credited to your player profile.
                  </Text>
                </Card>
              </View>
            ) : (
              /* TAB 2: Seasonal Events */
              <View>
                {events.map((evt) => (
                  <Card key={evt.id} style={styles.eventCard}>
                    <View style={[styles.eventBannerStrip, { backgroundColor: evt.bannerColor }]}>
                      <Ionicons name="flash" size={16} color="#000" />
                      <Text style={styles.eventBannerText}>{evt.subtitle.toUpperCase()}</Text>
                    </View>

                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    <Text style={styles.eventDesc}>{evt.description}</Text>

                    {/* Event Rules Box */}
                    <View style={styles.eventRulesBox}>
                      <Text style={styles.rulesTitle}>EVENT RULES:</Text>
                      <Text style={styles.rulesItem}>
                        • Range: {evt.rules.minRange ?? 1} to {evt.rules.maxRange ?? 150}
                      </Text>
                      {evt.rules.timeLimit && (
                        <Text style={styles.rulesItem}>• Time Limit: {evt.rules.timeLimit}s per match</Text>
                      )}
                      {evt.rules.lives && (
                        <Text style={styles.rulesItem}>• Lives: {evt.rules.lives} attempts</Text>
                      )}
                    </View>

                    {/* Challenges Milestones */}
                    <Text style={styles.challengesHeader}>EVENT CHALLENGES</Text>
                    <View style={styles.challengesList}>
                      {evt.challenges.map((c) => (
                        <View key={c.id} style={styles.challengeRow}>
                          <View style={styles.challengeInfo}>
                            <Text style={styles.challengeTitle}>{c.title}</Text>
                            <Text style={styles.challengeDesc}>{c.desc}</Text>
                          </View>
                          <View style={styles.challengeXpBadge}>
                            <Text style={styles.challengeXpText}>+{c.rewardXp} XP</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {onPlayEvent && (
                      <PrimaryButton
                        onPress={() => {
                          buzz("light");
                          playSound("button_click");
                          onPlayEvent(evt);
                        }}
                        variant="primary"
                        style={styles.playEventBtn}
                      >
                        PLAY EVENT PROTOCOL
                      </PrimaryButton>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.full,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tabBtnActive: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  tabBtnTextActive: {
    color: Colors.text,
    fontFamily: FontFamily.bodyBold,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  seasonBanner: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: "rgba(26, 27, 46, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.3)",
  },
  seasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  seasonBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 1.5,
  },
  seasonTitle: {
    fontSize: 24,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 4,
  },
  seasonTheme: {
    fontSize: 13,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.accent,
    marginBottom: 8,
  },
  seasonDates: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
  },
  statsCard: {
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statVal: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 12,
  },
  ladderList: {
    gap: 8,
    marginBottom: 20,
  },
  tierCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  currentTierCard: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "rgba(0, 210, 180, 0.08)",
  },
  tierLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tierIconWrap: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tierName: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
  },
  tierRequirement: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    marginTop: 2,
  },
  tierReward: {
    alignItems: "flex-end",
    maxWidth: 140,
  },
  rewardLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  rewardVal: {
    fontSize: 10,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.accent,
    textAlign: "right",
    marginTop: 2,
  },
  resetCard: {
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  resetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  resetTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  resetDesc: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
  },
  eventCard: {
    padding: 16,
    marginBottom: 16,
  },
  eventBannerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  eventBannerText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: "#000",
    letterSpacing: 1,
  },
  eventTitle: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 6,
  },
  eventDesc: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 14,
  },
  eventRulesBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  rulesTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  rulesItem: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.text,
    lineHeight: 18,
  },
  challengesHeader: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  challengesList: {
    gap: 8,
    marginBottom: 16,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    borderRadius: Radius.md,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  challengeDesc: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    marginTop: 2,
  },
  challengeXpBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  challengeXpText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
  },
  playEventBtn: {
    width: "100%",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
