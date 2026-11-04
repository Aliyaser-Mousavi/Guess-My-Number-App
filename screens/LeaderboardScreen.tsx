// ==============================================================================
// Screen: LeaderboardScreen.tsx
// Description: Server-Authoritative Global Ranked Leaderboard.
//              Displays verified player rankings, competitive ratings, tiers,
//              and user standing.
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
  LeaderboardService,
  type LeaderboardEntry,
  type UserLeaderboardPosition,
} from "@/services/leaderboard/LeaderboardService";
import { TIER_METADATA } from "@/services/competitive/CompetitiveRatingService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
};

export default function LeaderboardScreen({ onBack }: Props) {
  const { user } = useAuth();
  const { buzz, playSound, isRTL } = useGame();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userStanding, setUserStanding] = useState<UserLeaderboardPosition | null>(null);

  const userId = user?.id;

  const loadData = useCallback(async () => {
    try {
      const [list, pos] = await Promise.all([
        LeaderboardService.fetchGlobalRanked(50, 0),
        userId ? LeaderboardService.fetchUserPosition(userId) : Promise.resolve(null),
      ]);
      return { list, pos };
    } catch {
      return { list: [], pos: null };
    }
  }, [userId]);

  useEffect(() => {
    let ignore = false;

    loadData().then(({ list, pos }) => {
      if (!ignore) {
        setEntries(list);
        setUserStanding(pos);
        setLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    buzz("light");
    const { list, pos } = await loadData();
    setEntries(list);
    setUserStanding(pos);
    setRefreshing(false);
  }, [buzz, loadData]);

  function renderRankBadge(rank: number) {
    if (rank === 1) {
      return (
        <View style={[styles.rankBadge, { backgroundColor: "#FFD700" }]}>
          <Ionicons name="trophy" size={14} color="#000" />
          <Text style={[styles.rankText, { color: "#000" }]}>1</Text>
        </View>
      );
    }
    if (rank === 2) {
      return (
        <View style={[styles.rankBadge, { backgroundColor: "#C0C0C0" }]}>
          <Ionicons name="medal" size={14} color="#000" />
          <Text style={[styles.rankText, { color: "#000" }]}>2</Text>
        </View>
      );
    }
    if (rank === 3) {
      return (
        <View style={[styles.rankBadge, { backgroundColor: "#CD7F32" }]}>
          <Ionicons name="medal" size={14} color="#FFF" />
          <Text style={[styles.rankText, { color: "#FFF" }]}>3</Text>
        </View>
      );
    }
    return (
      <View style={styles.rankBadgeDefault}>
        <Text style={styles.rankTextDefault}>#{rank}</Text>
      </View>
    );
  }

  function renderItem({ item }: { item: LeaderboardEntry }) {
    const isCurrentUser = user?.id === item.userId;
    const tierMeta = TIER_METADATA[item.tier] || TIER_METADATA.beginner;

    return (
      <Card
        style={[
          styles.entryCard,
          isCurrentUser && styles.currentUserCard,
          isRTL && styles.rowReverse,
        ]}
      >
        <View style={[styles.leftWrap, isRTL && styles.rowReverse]}>
          {renderRankBadge(item.globalRank)}
          <View style={styles.avatarWrap}>
            <Ionicons name="person-circle" size={32} color={tierMeta.color} />
          </View>
          <View style={styles.infoWrap}>
            <Text style={[styles.playerName, isCurrentUser && styles.currentUserName]} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            <View style={[styles.tierRow, isRTL && styles.rowReverse]}>
              <Text style={[styles.tierLabel, { color: tierMeta.color }]}>
                {tierMeta.label} {item.division}
              </Text>
              <Text style={styles.winRateText}>
                · {item.winRate}% win rate ({item.rankedGamesWon}W)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rightWrap}>
          <Text style={styles.ratingNumber}>{item.rating}</Text>
          <Text style={styles.crLabel}>CR</Text>
        </View>
      </Card>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <PrimaryButton
            variant="ghost"
            size="sm"
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onBack();
            }}
            icon={<Ionicons name="arrow-back" size={20} color={Colors.text} />}
          >
            Back
          </PrimaryButton>
          <View style={styles.titleWrap}>
            <Title size="sm">Leaderboard</Title>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Sub-header info */}
        <View style={styles.subHeader}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.accent} />
          <Text style={styles.subHeaderText}>
            Official competitive rankings from server-verified matches.
          </Text>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading verified standings...</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centerWrap}>
            <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Season Has Just Begun</Text>
            <Text style={styles.emptySub}>
              Play a Ranked Match to earn your Competitive Rating and claim the #1 spot!
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.accent}
              />
            }
          />
        )}

        {/* Pinned User Standing Bar */}
        {userStanding && (
          <View style={[styles.pinnedBar, isRTL && styles.rowReverse]}>
            <View style={[styles.pinnedLeft, isRTL && styles.rowReverse]}>
              <View style={styles.pinnedRankBadge}>
                <Text style={styles.pinnedRankText}>#{userStanding.globalRank}</Text>
              </View>
              <View>
                <Text style={styles.pinnedName}>Your Standing</Text>
                <Text style={styles.pinnedTier}>
                  {TIER_METADATA[userStanding.tier]?.label} {userStanding.division}
                </Text>
              </View>
            </View>
            <View style={styles.pinnedRight}>
              <Text style={styles.pinnedRating}>{userStanding.rating}</Text>
              <Text style={styles.pinnedCr}>CR</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleWrap: {
    alignItems: "center",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  subHeaderText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
    gap: 8,
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  currentUserCard: {
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  leftWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    width: 34,
    height: 24,
    borderRadius: 12,
  },
  rankText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
  },
  rankBadgeDefault: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  rankTextDefault: {
    fontFamily: FontFamily.mono,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  avatarWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  infoWrap: {
    flex: 1,
  },
  playerName: {
    fontFamily: FontFamily.sans,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  currentUserName: {
    color: Colors.accent,
    fontWeight: "700",
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  tierLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    fontWeight: "700",
  },
  winRateText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  rightWrap: {
    alignItems: "flex-end",
  },
  ratingNumber: {
    fontFamily: FontFamily.mono,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  crLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    fontWeight: "600",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyTitle: {
    fontFamily: FontFamily.sans,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  emptySub: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  pinnedBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E2235",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pinnedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pinnedRankBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  pinnedRankText: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.bg,
  },
  pinnedName: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  pinnedTier: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  pinnedRight: {
    alignItems: "flex-end",
  },
  pinnedRating: {
    fontFamily: FontFamily.mono,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.accent,
  },
  pinnedCr: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },
});

