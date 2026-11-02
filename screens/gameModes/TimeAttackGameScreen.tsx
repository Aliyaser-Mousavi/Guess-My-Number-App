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
import { getDifficulty, type DifficultyId } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import {
  ProximityService,
  type ProximityFeedback,
} from "@/services/proximity/ProximityService";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
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
  durationSeconds?: number;
  onGameOver: (payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber: number;
  }) => void;
  onAbandon?: () => void;
};

export default function TimeAttackGameScreen({
  difficultyId,
  durationSeconds = 60,
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
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [isEnded, setIsEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const endedRef = useRef(false);

  const [secret, setSecret] = useState(() => {
    return (
      Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) +
      difficulty.min
    );
  });

  const [guess, setGuess] = useState("");
  const [hintsLeft, setHintsLeft] = useState(difficulty.hints);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(difficulty.min);
  const [high, setHigh] = useState(difficulty.max);
  const [lastProximity, setLastProximity] = useState<ProximityFeedback | null>(
    null,
  );

  const handleTimeOut = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setIsEnded(true);
    buzz("error");
    playSound("defeat");
    showAlert(
      "Time's Up!",
      `You ran out of time! The secret number was ${secret}.`,
      [
        {
          text: "View Results",
          onPress: () => {
            onGameOver({
              won: false,
              rounds: history.length,
              elapsedMs: durationSeconds * 1000,
              hintsUsed,
              guesses: history.map((h) => h.value),
              secretNumber: secret,
            });
          },
        },
      ],
    );
  }, [
    buzz,
    playSound,
    durationSeconds,
    hintsUsed,
    history,
    onGameOver,
    secret,
    showAlert,
  ]);

  const timeoutRef = useRef(handleTimeOut);
  useEffect(() => {
    timeoutRef.current = handleTimeOut;
  }, [handleTimeOut]);

  // Countdown timer loop - freezes when paused
  useEffect(() => {
    if (isEnded || isPaused) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          timeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnded, isPaused]);

  function handleRestart() {
    abandonSession();
    endedRef.current = false;
    setIsEnded(false);
    setIsPaused(false);
    setStartAt(Date.now());
    setTimeLeft(durationSeconds);
    const nextSecret =
      Math.floor(Math.random() * (difficulty.max - difficulty.min + 1)) +
      difficulty.min;
    setSecret(nextSecret);
    setGuess("");
    setHintsLeft(difficulty.hints);
    setHintsUsed(0);
    setHistory([]);
    setLow(difficulty.min);
    setHigh(difficulty.max);
    setLastProximity(null);

    startSession({
      mode: "timeAttack",
      difficultyId,
      isDaily: false,
      targetNumber: nextSecret,
    });
  }

  function finish(won: boolean, nextHistory: GuessEntry[]) {
    if (endedRef.current) return;
    endedRef.current = true;
    setIsEnded(true);
    buzz(won ? "success" : "error");

    const elapsedMs = Date.now() - startAt;
    onGameOver({
      won,
      rounds: nextHistory.length,
      elapsedMs,
      hintsUsed,
      guesses: nextHistory.map((h) => h.value),
      secretNumber: secret,
    });
  }

  function submitGuess() {
    if (isEnded || isPaused) return;
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
      showAlert("Already Guessed", `You already tried ${value}.`);
      return;
    }

    let result: GuessEntry["result"] = "correct";
    if (value < secret) result = "low";
    else if (value > secret) result = "high";

    recordSessionGuess(value, result);
    const entry: GuessEntry = { value, result };
    const nextHistory = [entry, ...history];
    setHistory(nextHistory);
    setGuess("");

    const proximity = ProximityService.getProximity(
      value,
      secret,
      difficulty.min,
      difficulty.max,
    );
    setLastProximity(proximity);

    if (result === "correct") {
      playSound("guess_correct");
      finish(true, nextHistory);
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
  }

  function handleUseClue() {
    if (hintsLeft <= 0 || isEnded || isPaused) return;
    recordSessionHint();
    setHintsLeft((h) => h - 1);
    setHintsUsed((u) => u + 1);
    buzz("light");
    playSound("button_click");
  }

  const isUrgent = timeLeft <= 10;

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

            {/* Countdown Badge */}
            <View
              style={[
                styles.timerBadge,
                isUrgent && styles.timerBadgeUrgent,
              ]}
            >
              <Ionicons
                name="timer"
                size={18}
                color={isUrgent ? Colors.coral : "#00E5FF"}
              />
              <Text
                style={[
                  styles.timerText,
                  isUrgent && { color: Colors.coral },
                ]}
              >
                {timeLeft}s
              </Text>
            </View>

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>ATTEMPTS</Text>
              <Text style={styles.hudValue}>{history.length}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Time Attack</Title>
            <SameText muted style={styles.rangeSub}>
              Find the number before the clock hits zero! ({difficulty.min}–{difficulty.max})
            </SameText>
          </View>

          {/* Centerpiece Number Display */}
          <NumberContainer label="CURRENT GUESS">
            {guess ? guess : "?"}
          </NumberContainer>

          {/* Proximity Feedback Pill */}
          <ProximityIndicator
            feedback={lastProximity}
            visible={settings.showProximity}
          />

          {/* Range Bar */}
          <RangeBar
            min={difficulty.min}
            max={difficulty.max}
            low={low}
            high={high + 1}
          />

          {/* Input & Guess Controls Card */}
          <Card variant="elevated" style={styles.inputCard}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(difficulty.max).length}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter number"
              placeholderTextColor={Colors.textDim}
              selectionColor="#00E5FF"
              editable={!isEnded && !isPaused}
            />
            <View style={styles.actionsRow}>
              <View style={{ flex: 1.6 }}>
                <PrimaryButton
                  variant="accent"
                  onPress={submitGuess}
                  disabled={isEnded || isPaused}
                  icon={<Ionicons name="send" size={17} color={Colors.bg} />}
                >
                  Submit Guess
                </PrimaryButton>
              </View>
              {hintsLeft > 0 && (
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    variant="ghost"
                    onPress={() => {
                      buzz("light");
                      playSound("button_click");
                      setHintModalVisible(true);
                    }}
                    disabled={isEnded || isPaused}
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
            <Text style={styles.historyHeader}>GUESS LOG</Text>
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

        {/* Anti-Cheat Pause Modal */}
        <PauseModal
          visible={isPaused}
          modeTitle="Time Attack Mode"
          onResume={() => setIsPaused(false)}
          onRestart={handleRestart}
          onAbandon={() => {
            setIsPaused(false);
            abandonSession();
            if (onAbandon) onAbandon();
          }}
        />
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
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: "#00E5FF",
  },
  timerBadgeUrgent: {
    borderColor: Colors.coral,
    backgroundColor: "rgba(255, 82, 82, 0.15)",
  },
  timerText: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    color: "#00E5FF",
    fontVariant: ["tabular-nums"],
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
    fontFamily: FontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1.2,
    color: Colors.textDim,
    marginBottom: 3,
  },
  hudValue: {
    fontFamily: FontFamily.display,
    fontSize: 14,
    color: Colors.text,
  },
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
    borderBottomColor: "#00E5FF",
    color: "#00E5FF",
    fontFamily: FontFamily.display,
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
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.textDim,
    marginBottom: 8,
  },
});
