import GameTimer from "@/components/game/GameTimer";
import GuessLogItem from "@/components/game/GuessLogItem";
import NumberContainer from "@/components/game/NumberContainer";
import PauseModal from "@/components/game/PauseModal";
import ProximityIndicator from "@/components/game/ProximityIndicator";
import RangeBar from "@/components/game/RangeBar";
import SmartHintModal from "@/components/game/SmartHintModal";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SameText from "@/components/ui/SameText";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import {
  getDailyNumber,
  getDifficulty,
  type DifficultyId,
} from "@/constants/gameConfig";
import { Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import {
  ServerAuthoritativeGameService,
  type ServerSessionInfo,
} from "@/services/serverGameplay/ServerAuthoritativeGameService";
import {
  ProximityService,
  type ProximityFeedback,
} from "@/services/proximity/ProximityService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GuessEntry = { value: number; result: "low" | "high" | "correct" };

type Props = {
  difficultyId: DifficultyId;
  isDaily: boolean;
  dailyDateStr?: string;
  isRanked?: boolean;
  serverSessionId?: string;
  onGameOver: (payload: {
    sessionId?: string;
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber: number;
    score?: number;
    isRanked?: boolean;
    isServerVerified?: boolean;
    ratingDelta?: number;
    newRating?: number;
    newTier?: string;
  }) => void;
  onAbandon?: () => void;
};

export default function PlayerGuessScreen({
  difficultyId,
  isDaily,
  dailyDateStr,
  isRanked = false,
  serverSessionId,
  onGameOver,
  onAbandon,
}: Props) {
  const difficulty = getDifficulty(difficultyId);
  const {
    buzz,
    playSound,
    settings,
    recordSessionGuess,
    recordSessionHint,
    abandonSession,
    startSession,
  } = useGame();
  const { showAlert } = useAppAlert();

  const [startAt, setStartAt] = useState(() => Date.now());
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const ended = useRef(false);

  const [secret, setSecret] = useState(() => {
    return isDaily
      ? getDailyNumber(difficulty.min, difficulty.max, dailyDateStr)
      : Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) +
          difficulty.min;
  });

  const [guess, setGuess] = useState("");
  const [lives, setLives] = useState(difficulty.playerLives);
  const [hintsLeft, setHintsLeft] = useState(difficulty.hints);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(difficulty.min);
  const [high, setHigh] = useState(difficulty.max);
  const [lastProximity, setLastProximity] = useState<ProximityFeedback | null>(
    null,
  );

  const [srvSessionId, setSrvSessionId] = useState<string | null>(serverSessionId || null);
  const [isConnecting, setIsConnecting] = useState(() => Boolean(isRanked && !serverSessionId));
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectServerSession = useCallback(async (): Promise<{
    success: boolean;
    session?: ServerSessionInfo;
    error?: string;
  }> => {
    try {
      return await ServerAuthoritativeGameService.startSession({
        difficulty: difficultyId,
        mode: "player",
        isRanked: true,
      });
    } catch (err: any) {
      return {
        success: false,
        session: undefined,
        error: err?.message || "Could not reach game server.",
      };
    }
  }, [difficultyId]);

  // Initialize server-authoritative session when isRanked is true
  useEffect(() => {
    if (isRanked && !srvSessionId) {
      let isMounted = true;

      connectServerSession().then((res) => {
        if (!isMounted) return;
        setIsConnecting(false);
        if (res.success && res.session) {
          setSrvSessionId(res.session.sessionId);
          setLow(res.session.minRange);
          setHigh(res.session.maxRange);
          setLives(res.session.livesRemaining);
          setHintsLeft(res.session.hintsRemaining);
          setConnectionError(null);
        } else {
          setConnectionError(res.error || "Could not reach game server.");
        }
      });

      return () => {
        isMounted = false;
      };
    }
  }, [isRanked, srvSessionId, connectServerSession]);

  const retryServerSession = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    const res = await connectServerSession();
    setIsConnecting(false);
    if (res.success && res.session) {
      setSrvSessionId(res.session.sessionId);
      setLow(res.session.minRange);
      setHigh(res.session.maxRange);
      setLives(res.session.livesRemaining);
      setHintsLeft(res.session.hintsRemaining);
      setConnectionError(null);
    } else {
      setConnectionError(res.error || "Could not reach game server.");
    }
  }, [connectServerSession]);

  async function handleRequestServerHint() {
    if (!srvSessionId || hintsLeft <= 0 || isPaused || isGameOver) return;
    try {
      const res = await ServerAuthoritativeGameService.requestHint(srvSessionId);
      if (res.success && res.hint) {
        buzz("success");
        playSound("button_click");
        const nextUsed = hintsUsed + 1;
        setHintsUsed(nextUsed);
        if (res.hintsRemaining != null) {
          setHintsLeft(res.hintsRemaining);
        } else {
          setHintsLeft((h) => Math.max(0, h - 1));
        }
        showAlert("Server Oracle Clue", res.hint);
      } else {
        buzz("error");
        showAlert("Hint Unavailable", res.error || "No hints available from server.");
      }
    } catch {
      buzz("error");
      showAlert("Network Error", "Could not retrieve hint from server.");
    }
  }

  function finish(won: boolean, nextHistory: GuessEntry[], usedHints: number) {
    if (ended.current) return;
    ended.current = true;
    setIsGameOver(true);
    buzz(won ? "success" : "error");
    onGameOver({
      won,
      rounds: nextHistory.length,
      elapsedMs: Date.now() - startAt,
      hintsUsed: usedHints,
      guesses: nextHistory.map((h) => h.value),
      secretNumber: secret,
    });
  }

  function handleRestart() {
    abandonSession();
    ended.current = false;
    setIsGameOver(false);
    setIsPaused(false);
    setStartAt(Date.now());
    const nextSecret = isDaily
      ? getDailyNumber(difficulty.min, difficulty.max)
      : Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) +
          difficulty.min;
    setSecret(nextSecret);
    setGuess("");
    setLives(difficulty.playerLives);
    setHintsLeft(difficulty.hints);
    setHintsUsed(0);
    setHistory([]);
    setLow(difficulty.min);
    setHigh(difficulty.max);
    setLastProximity(null);

    startSession({
      mode: "player",
      difficultyId,
      isDaily,
      targetNumber: nextSecret,
    });
  }

  function submitGuess() {
    if (isPaused || ended.current) return;
    const value = parseInt(guess, 10);
    if (isNaN(value) || value < difficulty.min || value > difficulty.max) {
      buzz("error");
      playSound("guess_wrong");
      showAlert(
        "Out of Range",
        `Enter a number between ${difficulty.min} and ${difficulty.max}.`,
      );
      return;
    }

    if (history.some((h) => h.value === value)) {
      buzz("error");
      playSound("guess_wrong");
      showAlert(
        "Already Guessed",
        `You already tried ${value}. Choose a different number.`,
      );
      return;
    }

    // 1. Server-Authoritative Branch for Ranked Matches (STRICT: Never fall back to offline)
    if (isRanked) {
      if (!srvSessionId) {
        buzz("error");
        setConnectionError("Session disconnected. Reconnect to resume ranked match.");
        return;
      }

      ServerAuthoritativeGameService.submitGuess(srvSessionId, value).then((res) => {
        if (res.success && res.result) {
          const srvRes = res.result;
          recordSessionGuess(value, srvRes.feedback);
          const entry: GuessEntry = { value, result: srvRes.feedback };
          const nextHistory = [entry, ...history];
          setHistory(nextHistory);
          setGuess("");

          if (srvRes.feedback === "low") setLow((l) => Math.max(l, value + 1));
          if (srvRes.feedback === "high") setHigh((h) => Math.min(h, value - 1));
          if (srvRes.livesRemaining != null) setLives(srvRes.livesRemaining);

          if (srvRes.isGameOver) {
            if (srvRes.won) {
              playSound("guess_correct");
              buzz("success");
            } else {
              buzz("error");
            }
            ended.current = true;
            setIsGameOver(true);
            onGameOver({
              sessionId: srvSessionId,
              won: srvRes.won,
              rounds: srvRes.rounds,
              elapsedMs: srvRes.elapsedMs || (Date.now() - startAt),
              hintsUsed,
              guesses: nextHistory.map((h) => h.value),
              secretNumber: srvRes.secretNumber || 0,
              score: srvRes.score,
              isRanked: true,
              isServerVerified: true,
              ratingDelta: srvRes.competitive?.rating_delta,
              newRating: srvRes.competitive?.new_rating,
              newTier: srvRes.competitive?.new_tier,
            });
          } else {
            buzz("medium");
            playSound("guess_wrong");
          }
        } else {
          showAlert("Server Error", res.error || "Failed to submit guess to game server.");
        }
      });
      return;
    }

    // 2. Local Engine Branch (Casual / Offline / Daily)
    let result: GuessEntry["result"] = "correct";
    if (value < secret) result = "low";
    else if (value > secret) result = "high";

    recordSessionGuess(value, result);
    const entry: GuessEntry = { value, result };
    const nextHistory = [entry, ...history];
    setHistory(nextHistory);
    setGuess("");

    // Calculate proximity feedback
    const proximity = ProximityService.getProximity(
      value,
      secret,
      difficulty.min,
      difficulty.max,
    );
    setLastProximity(proximity);

    if (result === "correct") {
      playSound("guess_correct");
      finish(true, nextHistory, hintsUsed);
      return;
    }

    buzz("medium");
    if (proximity.level === "very_hot" || proximity.level === "hot") {
      playSound("hot");
    } else if (proximity.level === "very_cold") {
      playSound("cold");
    } else {
      playSound("guess_wrong");
    }

    if (result === "low") setLow((l) => Math.max(l, value + 1));
    if (result === "high") setHigh((h) => Math.min(h, value - 1));

    const nextLives = lives - 1;
    setLives(nextLives);
    if (nextLives <= 0) {
      finish(false, nextHistory, hintsUsed);
    }
  }

  function handleUseClue(clue: string) {
    if (hintsLeft <= 0 || ended.current) return;
    recordSessionHint();
    const used = hintsUsed + 1;
    setHintsLeft((h) => h - 1);
    setHintsUsed(used);
    buzz("light");
    playSound("button_click");
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          {/* Top HUD with Pause Button */}
          <View style={styles.hud}>
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
                setIsPaused(true);
              }}
              style={({ pressed }) => [
                styles.pauseBtn,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Pause Game"
            >
              <Ionicons name="pause" size={16} color={Colors.text} />
            </Pressable>

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>LIVES</Text>
              <View style={styles.livesRow}>
                {Array.from({ length: difficulty.playerLives }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < lives ? "heart" : "heart-outline"}
                    size={13}
                    color={i < lives ? Colors.coral : Colors.textDim}
                  />
                ))}
              </View>
            </View>

            {settings.showTimer && (
              <GameTimer
                running={!isGameOver}
                paused={isPaused}
                startAt={startAt}
              />
            )}

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>GUESSES</Text>
              <Text style={styles.hudValue}>{history.length}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Hunt the Secret</Title>
            <SameText muted style={styles.rangeSub}>
              Target Range: {difficulty.min} – {difficulty.max}
            </SameText>
          </View>

          {/* Centerpiece Number Display */}
          <NumberContainer label="YOUR CURRENT GUESS">
            {guess ? guess : "?"}
          </NumberContainer>

          {/* Proximity Feedback Pill */}
          <ProximityIndicator
            feedback={lastProximity}
            visible={settings.showProximity}
          />

          {/* Search Range Bar */}
          {settings.showRangeBar && (
            <RangeBar
              min={difficulty.min}
              max={difficulty.max}
              low={low}
              high={high + 1}
            />
          )}

          {/* Input & Guess Controls Card */}
          <Card variant="elevated" style={styles.inputCard}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(difficulty.max).length}
              value={guess}
              onChangeText={setGuess}
              placeholder={isConnecting ? "Connecting..." : "Enter number"}
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.accent}
              editable={!isPaused && !isGameOver && !isConnecting}
            />
            <View style={styles.actionsRow}>
              <View style={{ flex: 1.6 }}>
                <PrimaryButton
                  variant="accent"
                  onPress={submitGuess}
                  disabled={isPaused || isGameOver || isConnecting}
                  icon={<Ionicons name="send" size={17} color={Colors.bg} />}
                >
                  {isConnecting ? "Connecting..." : "Submit Guess"}
                </PrimaryButton>
              </View>
              {hintsLeft > 0 && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    variant="ghost"
                    onPress={() => {
                      buzz("light");
                      playSound("button_click");
                      if (isRanked && srvSessionId) {
                        handleRequestServerHint();
                      } else {
                        setHintModalVisible(true);
                      }
                    }}
                    disabled={isPaused || isGameOver || isConnecting}
                    icon={
                      <Ionicons
                        name="bulb-outline"
                        size={16}
                        color={Colors.accent}
                      />
                    }
                  >
                    Hints ({hintsLeft})
                  </PrimaryButton>
                </View>
              )}
            </View>
          </Card>

          {/* Guess Log History */}
          <View style={styles.listContainer}>
            <Text style={styles.historyHeader}>YOUR GUESS HISTORY</Text>
            <FlatList
              data={history}
              keyExtractor={(item, i) => `${item.value}-${i}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <GuessLogItem
                  roundNumber={history.length - index}
                  guess={item.value}
                  note={
                    item.result === "correct"
                      ? "correct!"
                      : item.result === "low"
                        ? "too low"
                        : "too high"
                  }
                />
              )}
            />
          </View>
        </View>

        {/* Smart Hints Modal */}
        <SmartHintModal
          visible={hintModalVisible}
          hintsRemaining={hintsLeft}
          secret={secret}
          low={low}
          high={high}
          onUseHint={handleUseClue}
          onClose={() => setHintModalVisible(false)}
        />

        {/* Pause & Anti-Cheat Obscuring Modal */}
        <PauseModal
          visible={isPaused}
          modeTitle="You Guess (Hunter Mode)"
          onResume={() => setIsPaused(false)}
          onRestart={handleRestart}
          onAbandon={() => {
            setIsPaused(false);
            abandonSession();
            if (isRanked && srvSessionId) {
              ServerAuthoritativeGameService.abandonSession(srvSessionId).catch(() => {});
            }
            if (onAbandon) onAbandon();
          }}
        />

        {/* Ranked Connection Error Modal (Strict Anti-Offline Guard) */}
        <Modal
          visible={Boolean(isRanked && connectionError)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (onAbandon) onAbandon();
          }}
        >
          <View style={styles.errorModalOverlay}>
            <Card variant="elevated" style={styles.errorModalCard}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="cloud-offline" size={32} color={Colors.coral} />
              </View>
              <Title size="sm" style={{ textAlign: "center", marginBottom: 8 }}>
                Ranked Server Offline
              </Title>
              <Text style={styles.errorModalText}>
                {connectionError || "Could not establish a verified game session with the competitive server."}
              </Text>
              <View style={{ gap: 10, width: "100%", marginTop: 16 }}>
                <PrimaryButton
                  variant="accent"
                  onPress={retryServerSession}
                  icon={<Ionicons name="refresh" size={16} color={Colors.bg} />}
                >
                  Retry Connection
                </PrimaryButton>
                <PrimaryButton
                  variant="ghost"
                  onPress={() => {
                    if (onAbandon) onAbandon();
                  }}
                  icon={<Ionicons name="arrow-back" size={16} color={Colors.text} />}
                >
                  Return to Menu
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
  safe: { flex: 1 },
  screen: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  pauseBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hudChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  hudLabel: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.textDim,
    marginBottom: 3,
  },
  hudValue: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 14,
    color: Colors.text,
  },
  livesRow: { flexDirection: "row", gap: 3, alignItems: "center" },
  headerArea: { alignItems: "center", marginVertical: 4 },
  rangeSub: { fontSize: 13, marginTop: 2 },
  inputCard: {
    marginVertical: 10,
    padding: 14,
    borderRadius: Radius.lg,
  },
  input: {
    height: 52,
    fontSize: 32,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    fontFamily: "SpaceGrotesk-Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
  },
  historyHeader: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.textDim,
    marginBottom: 8,
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorModalCard: {
    width: "100%",
    maxWidth: 380,
    padding: 20,
    alignItems: "center",
  },
  errorIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  errorModalText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
  },
});
