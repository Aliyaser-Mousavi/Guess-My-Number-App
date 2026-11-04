// ==============================================================================
// Screen: MultiplayerGameScreen.tsx
// Description: Real-time 1v1 Online Multiplayer Head-to-Head Race.
//              Synchronized server-authoritative guessing with masked opponent
//              progress telemetry and disconnect/forfeit management.
// ==============================================================================

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import type { DifficultyId } from "@/constants/gameConfig";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import {
  MultiplayerService,
  type OpponentInfo,
  type OpponentProgress,
} from "@/services/multiplayer/MultiplayerService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface GuessLog {
  value: number;
  feedback: "low" | "high" | "correct";
}

type Props = {
  matchId: string;
  opponent?: OpponentInfo;
  minRange: number;
  maxRange: number;
  livesRemaining: number;
  difficulty: DifficultyId;
  onExit: () => void;
};

export default function MultiplayerGameScreen({
  matchId,
  opponent: initialOpponent,
  minRange: initialMin,
  maxRange: initialMax,
  livesRemaining: initialLives,
  difficulty,
  onExit,
}: Props) {
  const { user } = useAuth();
  const { buzz, playSound, isRTL } = useGame();

  const [guess, setGuess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lowBound, setLowBound] = useState(initialMin);
  const [highBound, setHighBound] = useState(initialMax);
  const [myLives, setMyLives] = useState(initialLives);
  const [history, setHistory] = useState<GuessLog[]>([]);

  // Opponent state
  const [opponent, setOpponent] = useState<OpponentInfo | undefined>(initialOpponent);
  const [opponentProgress, setOpponentProgress] = useState<OpponentProgress>({
    rounds: 0,
    livesRemaining: initialLives,
    lowBound: initialMin,
    highBound: initialMax,
    solved: false,
  });

  // End game state
  const [gameOver, setGameOver] = useState(false);
  const [iWon, setIWon] = useState(false);
  const [secretNumber, setSecretNumber] = useState<number | null>(null);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [newRating, setNewRating] = useState<number | null>(null);
  const [newTier, setNewTier] = useState<string | null>(null);
  const [showForfeitModal, setShowForfeitModal] = useState(false);

  const pollIntervalRef = useRef<any>(null);
  const isMatchEndedRef = useRef(false);

  // Poll Match State & Opponent Progress
  useEffect(() => {
    pollIntervalRef.current = setInterval(async () => {
      if (isMatchEndedRef.current) return;
      const state = await MultiplayerService.pollMatchState(matchId);
      if (!state) return;

      if (state.opponent && !opponent) {
        setOpponent(state.opponent);
      }

      if (state.opponentProgress) {
        setOpponentProgress(state.opponentProgress);

        // Check if opponent solved first
        if (state.opponentProgress.solved && !isMatchEndedRef.current) {
          isMatchEndedRef.current = true;
          setGameOver(true);
          setIWon(false);
          buzz("error");
          playSound("defeat");
        }
      }

      // Check if match completed or abandoned
      if ((state.status === "completed" || state.status === "abandoned") && !isMatchEndedRef.current) {
        isMatchEndedRef.current = true;
        setGameOver(true);
        if (state.winnerId) {
          const won = state.winnerId === user?.id;
          setIWon(won);
          buzz(won ? "success" : "error");
          if (won) playSound("victory");
          else playSound("defeat");
        }
      }
    }, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [matchId, opponent, user?.id, buzz, playSound]);

  const handleGuessSubmit = async () => {
    if (gameOver || submitting || isMatchEndedRef.current) return;
    const num = parseInt(guess, 10);
    if (isNaN(num) || num < initialMin || num > initialMax) {
      buzz("error");
      playSound("guess_wrong");
      Alert.alert("Invalid Guess", `Please enter a number between ${initialMin} and ${initialMax}.`);
      return;
    }

    if (history.some((h) => h.value === num)) {
      buzz("error");
      playSound("guess_wrong");
      Alert.alert("Already Guessed", `You already guessed ${num}. Try a different number.`);
      return;
    }

    setSubmitting(true);
    buzz("light");
    playSound("button_click");

    const res = await MultiplayerService.submitGuess(matchId, num);
    setSubmitting(false);

    if (!res.success) {
      buzz("error");
      Alert.alert("Error", res.error || "Failed to submit guess.");
      return;
    }

    const fb = res.feedback || "low";
    setHistory((prev) => [{ value: num, feedback: fb }, ...prev]);
    setGuess("");

    if (res.lowBound != null) setLowBound(res.lowBound);
    if (res.highBound != null) setHighBound(res.highBound);
    if (res.livesRemaining != null) setMyLives(res.livesRemaining);

    if (res.opponentProgress) {
      setOpponentProgress(res.opponentProgress);
    }

    if (res.isGameOver) {
      isMatchEndedRef.current = true;
      setGameOver(true);
      const won = Boolean(res.won);
      setIWon(won);
      if (res.secretNumber != null) setSecretNumber(res.secretNumber);

      if (res.competitive) {
        setRatingDelta(res.competitive.ratingDelta);
        setNewRating(res.competitive.newRating);
        setNewTier(res.competitive.newTier);
      }

      if (won) {
        buzz("success");
        playSound("guess_correct");
        playSound("victory");
      } else {
        buzz("error");
        playSound("defeat");
      }
    } else {
      playSound("guess_wrong");
      buzz("light");
    }
  };

  const handleForfeit = async () => {
    setShowForfeitModal(false);
    buzz("error");
    playSound("button_click");
    isMatchEndedRef.current = true;
    await MultiplayerService.forfeitMatch(matchId);
    onExit();
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <Pressable
            style={styles.forfeitBtn}
            onPress={() => setShowForfeitModal(true)}
          >
            <Ionicons name="flag-outline" size={18} color={Colors.coral} />
            <Text style={styles.forfeitBtnText}>FORFEIT</Text>
          </Pressable>
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>1v1 {difficulty.toUpperCase()}</Text>
          </View>
          <View style={styles.spacer} />
        </View>

        {/* Head-to-Head Opponent Progress Bar */}
        <Card style={styles.opponentCard}>
          <View style={styles.opponentRow}>
            <View style={styles.opponentIdentity}>
              <View style={styles.oppAvatarWrap}>
                <Ionicons name="person" size={20} color={Colors.accent} />
              </View>
              <View>
                <Text style={styles.oppName}>
                  {opponent ? opponent.displayName : "Opponent"}
                </Text>
                <Text style={styles.oppRating}>
                  {opponent?.tier ? `${opponent.tier.toUpperCase()} • ` : ""}
                  {opponent?.rating ?? 1200} CR
                </Text>
              </View>
            </View>

            <View style={styles.oppStatusWrap}>
              <View style={styles.oppStatBadge}>
                <Ionicons name="heart" size={14} color={Colors.coral} />
                <Text style={styles.oppStatText}>{opponentProgress.livesRemaining}</Text>
              </View>
              <View style={styles.oppStatBadge}>
                <Ionicons name="refresh" size={14} color={Colors.primary} />
                <Text style={styles.oppStatText}>{opponentProgress.rounds} tries</Text>
              </View>
            </View>
          </View>

          {/* Masked Range Gauge */}
          <View style={styles.rangeGaugeContainer}>
            <Text style={styles.gaugeLabel}>
              Opponent Range: [{opponentProgress.lowBound ?? initialMin} – {opponentProgress.highBound ?? initialMax}]
            </Text>
            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        100 -
                          (((opponentProgress.highBound ?? initialMax) -
                            (opponentProgress.lowBound ?? initialMin)) /
                            (initialMax - initialMin)) *
                            100
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Local Player Arena */}
        <View style={styles.playerArena}>
          {/* Target Range & Lives */}
          <Card style={styles.rangeCard}>
            <Text style={styles.rangeHintText}>SEARCH RANGE</Text>
            <Text style={styles.rangeBoundsText}>
              {lowBound} <Text style={styles.rangeDash}>—</Text> {highBound}
            </Text>

            <View style={styles.livesRow}>
              {Array.from({ length: Math.min(10, initialLives) }).map((_, i) => (
                <Ionicons
                  key={i}
                  name="heart"
                  size={20}
                  color={i < myLives ? Colors.coral : "rgba(255,255,255,0.15)"}
                />
              ))}
            </View>
          </Card>

          {/* Input & Guess Button */}
          {!gameOver && (
            <Card style={styles.inputCard}>
              <TextInput
                style={styles.numberInput}
                keyboardType="number-pad"
                placeholder="?"
                placeholderTextColor={Colors.textDim}
                value={guess}
                onChangeText={setGuess}
                maxLength={5}
                editable={!submitting}
              />
              <PrimaryButton
                onPress={handleGuessSubmit}
                variant="primary"
                disabled={submitting || !guess.trim()}
                style={styles.submitBtn}
              >
                {submitting ? "CHECKING..." : "SUBMIT GUESS"}
              </PrimaryButton>
            </Card>
          )}

          {/* Guess History Chips */}
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>GUESS TELEMETRY</Text>
            <FlatList
              data={history}
              keyExtractor={(_, idx) => idx.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyList}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.historyChip,
                    item.feedback === "low" && styles.chipLow,
                    item.feedback === "high" && styles.chipHigh,
                    item.feedback === "correct" && styles.chipCorrect,
                  ]}
                >
                  <Text style={styles.historyValue}>{item.value}</Text>
                  <Text style={styles.historyFeedback}>
                    {item.feedback === "low"
                      ? "TOO LOW"
                      : item.feedback === "high"
                      ? "TOO HIGH"
                      : "SOLVED"}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyHistory}>No guesses yet. Enter a number to start!</Text>
              }
            />
          </View>
        </View>

        {/* Game Over Modal / Result Banner */}
        <Modal visible={gameOver} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <Card style={styles.resultModalCard}>
              <Ionicons
                name={iWon ? "trophy" : "skull-outline"}
                size={64}
                color={iWon ? Colors.accent : Colors.coral}
                style={styles.resultIcon}
              />
              <Title style={[styles.resultTitle, { color: iWon ? Colors.accent : Colors.coral }]}>
                {iWon ? "VICTORY!" : "DEFEAT"}
              </Title>
              <Text style={styles.resultSubtitle}>
                {iWon
                  ? "You cracked the secret number before your opponent!"
                  : "Your opponent solved the secret number first."}
              </Text>

              {secretNumber != null && (
                <View style={styles.secretBadge}>
                  <Text style={styles.secretLabel}>SECRET NUMBER</Text>
                  <Text style={styles.secretVal}>{secretNumber}</Text>
                </View>
              )}

              {ratingDelta != null && (
                <View style={styles.ratingDeltaBox}>
                  <Text style={styles.ratingDeltaLabel}>RATING UPDATE</Text>
                  <Text
                    style={[
                      styles.ratingDeltaVal,
                      { color: ratingDelta >= 0 ? Colors.mint : Colors.coral },
                    ]}
                  >
                    {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} CR
                  </Text>
                  {newRating != null && (
                    <Text style={styles.newRatingText}>
                      New Rating: {newRating} {newTier ? `(${newTier.toUpperCase()})` : ""}
                    </Text>
                  )}
                </View>
              )}

              <PrimaryButton
                onPress={onExit}
                variant="primary"
                style={styles.exitBtn}
              >
                RETURN TO LOBBY
              </PrimaryButton>
            </Card>
          </View>
        </Modal>

        {/* Forfeit Confirmation Modal */}
        <Modal visible={showForfeitModal} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <Card style={styles.confirmModalCard}>
              <Ionicons name="warning" size={48} color={Colors.coral} />
              <Text style={styles.confirmTitle}>FORFEIT MATCH?</Text>
              <Text style={styles.confirmText}>
                Leaving the match early will forfeit the game. Your opponent will be awarded the victory and you will lose Competitive Rating (CR).
              </Text>
              <View style={styles.confirmBtns}>
                <PrimaryButton
                  onPress={() => setShowForfeitModal(false)}
                  variant="secondary"
                  style={styles.halfBtn}
                >
                  CANCEL
                </PrimaryButton>
                <PrimaryButton
                  onPress={handleForfeit}
                  variant="danger"
                  style={styles.halfBtn}
                >
                  FORFEIT
                </PrimaryButton>
              </View>
            </Card>
          </View>
        </Modal>
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
    paddingVertical: 10,
  },
  forfeitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 92, 114, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 92, 114, 0.3)",
  },
  forfeitBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.coral,
  },
  matchBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.3)",
  },
  matchBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  spacer: {
    width: 60,
  },
  opponentCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    backgroundColor: "rgba(26, 27, 46, 0.8)",
  },
  opponentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  opponentIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  oppAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  oppName: {
    fontSize: 14,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  oppRating: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  oppStatusWrap: {
    flexDirection: "row",
    gap: 8,
  },
  oppStatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  oppStatText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  rangeGaugeContainer: {
    marginTop: 2,
  },
  gaugeLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
    marginBottom: 4,
  },
  gaugeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  playerArena: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  rangeCard: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "rgba(26, 27, 46, 0.9)",
  },
  rangeHintText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 6,
  },
  rangeBoundsText: {
    fontSize: 36,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 12,
  },
  rangeDash: {
    color: Colors.textDim,
  },
  livesRow: {
    flexDirection: "row",
    gap: 6,
  },
  inputCard: {
    padding: 16,
    alignItems: "center",
  },
  numberInput: {
    width: "100%",
    height: 64,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.md,
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: 32,
    textAlign: "center",
    marginBottom: 12,
  },
  submitBtn: {
    width: "100%",
  },
  historyContainer: {
    marginTop: 10,
  },
  historyTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyList: {
    gap: 8,
    paddingVertical: 4,
  },
  historyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: "center",
    minWidth: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  chipLow: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(0, 210, 180, 0.4)",
  },
  chipHigh: {
    backgroundColor: "rgba(255, 92, 114, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 92, 114, 0.4)",
  },
  chipCorrect: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  historyValue: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  historyFeedback: {
    fontSize: 9,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    marginTop: 2,
  },
  emptyHistory: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    paddingVertical: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  resultModalCard: {
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  resultIcon: {
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  secretBadge: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    alignItems: "center",
    marginBottom: 16,
  },
  secretLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  secretVal: {
    fontSize: 24,
    fontFamily: FontFamily.display,
    color: Colors.primary,
    marginTop: 2,
  },
  ratingDeltaBox: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingDeltaLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  ratingDeltaVal: {
    fontSize: 24,
    fontFamily: FontFamily.display,
    marginTop: 4,
  },
  newRatingText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
    marginTop: 2,
  },
  exitBtn: {
    width: "100%",
  },
  confirmModalCard: {
    width: "100%",
    padding: 24,
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  halfBtn: {
    flex: 1,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
