// ==============================================================================
// Screen: TournamentsScreen.tsx
// Description: Weekly Competitive Tournaments with limited attempts, verified
//              scoring, tier rewards preview, and global tournament leaderboard.
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
  TournamentService,
  type TournamentInfo,
  type TournamentParticipantInfo,
  type TournamentLeaderboardEntry,
} from "@/services/tournament/TournamentService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onBack: () => void;
  onStartAttempt: (tournament: TournamentInfo) => void;
};

export default function TournamentsScreen({ onBack, onStartAttempt }: Props) {
  const { user } = useAuth();
  const { buzz, playSound } = useGame();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [participant, setParticipant] = useState<TournamentParticipantInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<TournamentLeaderboardEntry[]>([]);

  const userId = user?.id;

  const loadTournamentData = useCallback(async () => {
    try {
      const activeTournament = await TournamentService.fetchActiveTournament();
      let participantData: TournamentParticipantInfo | null = null;
      if (activeTournament && userId) {
        participantData = await TournamentService.fetchParticipant(
          activeTournament.tournamentId,
          userId,
        );
      }
      const board = activeTournament
        ? await TournamentService.fetchLeaderboard(activeTournament.tournamentId)
        : [];
      return { activeTournament, participantData, board };
    } catch {
      return { activeTournament: null, participantData: null, board: [] };
    }
  }, [userId]);

  useEffect(() => {
    let ignore = false;
    loadTournamentData().then(({ activeTournament, participantData, board }) => {
      if (!ignore) {
        setTournament(activeTournament);
        setParticipant(participantData);
        setLeaderboard(board);
        setLoading(false);
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadTournamentData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const { activeTournament, participantData, board } = await loadTournamentData();
    setTournament(activeTournament);
    setParticipant(participantData);
    setLeaderboard(board);
    setRefreshing(false);
  }, [loadTournamentData]);

  const attemptsLeft = tournament
    ? Math.max(0, tournament.maxAttempts - (participant?.attemptsUsed || 0))
    : 0;

  const handleStartRun = () => {
    if (!tournament) return;
    buzz("light");
    playSound("button_click");
    onStartAttempt(tournament);
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Title style={styles.title}>TOURNAMENTS</Title>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : !tournament ? (
          <View style={styles.centerContainer}>
            <Ionicons name="trophy-outline" size={64} color={Colors.textDim} />
            <Text style={styles.noTournamentText}>No active weekly tournament available.</Text>
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.userId}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.headerSection}>
                {/* Active Tournament Card */}
                <Card style={styles.tournamentCard}>
                  <View style={styles.tournamentBadge}>
                    <Ionicons name="flame" size={16} color={Colors.accent} />
                    <Text style={styles.tournamentBadgeText}>WEEKLY CHAMPIONSHIP</Text>
                  </View>
                  <Text style={styles.tournamentTitle}>{tournament.title}</Text>
                  <Text style={styles.tournamentDesc}>{tournament.description}</Text>

                  {/* Range & Rule Specs */}
                  <View style={styles.specsRow}>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>RANGE</Text>
                      <Text style={styles.specVal}>{tournament.minRange} – {tournament.maxRange}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>DIFFICULTY</Text>
                      <Text style={styles.specVal}>{tournament.difficulty.toUpperCase()}</Text>
                    </View>
                    <View style={styles.specBox}>
                      <Text style={styles.specLabel}>ATTEMPTS</Text>
                      <Text style={styles.specVal}>{tournament.maxAttempts} MAX</Text>
                    </View>
                  </View>
                </Card>

                {/* Player Attempts & Start CTA */}
                <Card style={styles.attemptsCard}>
                  <View style={styles.attemptsHeader}>
                    <Text style={styles.attemptsLabel}>YOUR TOURNAMENT RUN</Text>
                    <Text style={styles.attemptsCounter}>
                      {participant?.attemptsUsed || 0} / {tournament.maxAttempts} Attempts Used
                    </Text>
                  </View>

                  <View style={styles.bestScoreRow}>
                    <View>
                      <Text style={styles.bestScoreLabel}>BEST SCORE</Text>
                      <Text style={styles.bestScoreVal}>
                        {participant?.bestScore ? `${participant.bestScore} pts` : "—"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.bestScoreLabel}>BEST ROUNDS</Text>
                      <Text style={styles.bestScoreVal}>
                        {participant?.bestRounds ? `${participant.bestRounds} guesses` : "—"}
                      </Text>
                    </View>
                  </View>

                  <PrimaryButton
                    onPress={handleStartRun}
                    variant={attemptsLeft > 0 ? "primary" : "secondary"}
                    disabled={attemptsLeft <= 0}
                    style={styles.startBtn}
                  >
                    {attemptsLeft > 0 ? `START ATTEMPT (${attemptsLeft} LEFT)` : "NO ATTEMPTS REMAINING"}
                  </PrimaryButton>
                </Card>

                {/* Reward Tiers Strip */}
                <Card style={styles.rewardsCard}>
                  <Text style={styles.rewardsTitle}>TOURNAMENT REWARDS</Text>
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardPill}>
                      <Text style={styles.rewardRank}>1st Place</Text>
                      <Text style={styles.rewardPrize}>1,200 XP + Crown</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <Text style={styles.rewardRank}>Top 5</Text>
                      <Text style={styles.rewardPrize}>600 XP</Text>
                    </View>
                    <View style={styles.rewardPill}>
                      <Text style={styles.rewardRank}>Top 20</Text>
                      <Text style={styles.rewardPrize}>300 XP</Text>
                    </View>
                  </View>
                </Card>

                <Text style={styles.boardHeader}>GLOBAL STANDINGS</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <Card style={styles.leaderRow}>
                <View style={styles.rankBox}>
                  {index === 0 ? (
                    <Ionicons name="trophy" size={24} color={Colors.accent} />
                  ) : index === 1 ? (
                    <Ionicons name="trophy" size={22} color="#D1D5DB" />
                  ) : index === 2 ? (
                    <Ionicons name="trophy" size={20} color="#F59E0B" />
                  ) : (
                    <Text style={styles.rankText}>#{item.tournamentRank}</Text>
                  )}
                </View>

                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{item.displayName}</Text>
                  <Text style={styles.playerMeta}>
                    {item.bestRounds} guesses • {item.attemptsUsed} tries
                  </Text>
                </View>

                <View style={styles.scoreBox}>
                  <Text style={styles.scoreText}>{item.bestScore} pts</Text>
                </View>
              </Card>
            )}
            ListEmptyComponent={
              <Card style={styles.emptyBoardCard}>
                <Text style={styles.emptyBoardText}>
                  No participants on the board yet. Be the first to set a score!
                </Text>
              </Card>
            }
          />
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  noTournamentText: {
    fontSize: 16,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    marginTop: 12,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 8,
  },
  tournamentCard: {
    padding: 20,
    marginBottom: 16,
    backgroundColor: "rgba(26, 27, 46, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  tournamentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  tournamentBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  tournamentTitle: {
    fontSize: 22,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 6,
  },
  tournamentDesc: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 16,
  },
  specsRow: {
    flexDirection: "row",
    gap: 10,
  },
  specBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  specLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 2,
  },
  specVal: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
  },
  attemptsCard: {
    padding: 16,
    marginBottom: 16,
  },
  attemptsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  attemptsLabel: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    letterSpacing: 1,
  },
  attemptsCounter: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
  },
  bestScoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  bestScoreLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 2,
  },
  bestScoreVal: {
    fontSize: 18,
    fontFamily: FontFamily.display,
    color: Colors.accent,
    textAlign: "center",
  },
  startBtn: {
    width: "100%",
  },
  rewardsCard: {
    padding: 14,
    marginBottom: 16,
  },
  rewardsTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 10,
  },
  rewardsRow: {
    flexDirection: "row",
    gap: 8,
  },
  rewardPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: "center",
  },
  rewardRank: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    marginBottom: 2,
  },
  rewardPrize: {
    fontSize: 10,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  boardHeader: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 8,
  },
  rankBox: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  playerName: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  playerMeta: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    marginTop: 2,
  },
  scoreBox: {
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.mint,
  },
  emptyBoardCard: {
    padding: 24,
    alignItems: "center",
  },
  emptyBoardText: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
  },
  });
