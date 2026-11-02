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
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import {
  ProximityService,
  type ProximityFeedback,
} from "@/services/proximity/ProximityService";
import type { CustomGameConfig } from "@/types/game";
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
  config: CustomGameConfig;
  userNumber?: number; // In opponent subMode
  onGameOver: (payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber: number;
    score: number;
  }) => void;
  onAbandon?: () => void;
};

export default function CustomGameScreen({
  config,
  userNumber,
  onGameOver,
  onAbandon,
}: Props) {
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
  const [secondsLeft, setSecondsLeft] = useState(config.timerSeconds ?? 0);
  const [livesLeft, setLivesLeft] = useState(config.lives);
  const [hintsLeft, setHintsLeft] = useState(config.hints);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const endedRef = useRef(false);

  function pickSecret(): number {
    if (config.subMode === "opponent" && userNumber != null) {
      return userNumber;
    }
    return Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
  }

  const [secret, setSecret] = useState(pickSecret);
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(config.min);
  const [high, setHigh] = useState(config.max);
  const [lastProximity, setLastProximity] = useState<ProximityFeedback | null>(
    null,
  );

  const handleTimeOut = React.useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setIsEnded(true);
    buzz("error");
    playSound("defeat");
    showAlert("Time's Up!", `Custom match timer expired. The target was ${secret}.`, [
      {
        text: "Finish",
        onPress: () => {
          onGameOver({
            won: false,
            rounds: history.length,
            elapsedMs: (config.timerSeconds ?? 60) * 1000,
            hintsUsed,
            guesses: history.map((h) => h.value),
            secretNumber: secret,
            score: 0,
          });
        },
      },
    ]);
  }, [buzz, playSound, config.timerSeconds, hintsUsed, history, onGameOver, secret, showAlert]);

  const timeoutRef = useRef(handleTimeOut);
  useEffect(() => {
    timeoutRef.current = handleTimeOut;
  }, [handleTimeOut]);

  // Timer countdown if configured - freezes when paused
  useEffect(() => {
    if (config.timerSeconds == null || isEnded || isPaused) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          timeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.timerSeconds, isEnded, isPaused]);

  function handleRestart() {
    abandonSession();
    endedRef.current = false;
    setIsEnded(false);
    setIsPaused(false);
    setStartAt(Date.now());
    setSecondsLeft(config.timerSeconds ?? 0);
    setLivesLeft(config.lives);
    setHintsLeft(config.hints);
    setHintsUsed(0);
    const nextSecret = pickSecret();
    setSecret(nextSecret);
    setGuess("");
    setHistory([]);
    setLow(config.min);
    setHigh(config.max);
    setLastProximity(null);

    startSession({
      mode: "custom",
      difficultyId: "medium",
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
    const score = won
      ? Math.max(100, (config.max - config.min) * 5 - nextHistory.length * 20)
      : 0;

    onGameOver({
      won,
      rounds: nextHistory.length,
      elapsedMs,
      hintsUsed,
      guesses: nextHistory.map((h) => h.value),
      secretNumber: secret,
      score,
    });
  }

  function submitGuess() {
    if (isEnded || isPaused) return;
    const value = parseInt(guess, 10);
    if (isNaN(value) || value < config.min || value > config.max) {
      buzz("error");
      playSound("guess_wrong");
      showAlert("Out of Range", `Enter a number between ${config.min} and ${config.max}.`);
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

    const proximity = ProximityService.getProximity(value, secret, config.min, config.max);
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

    if (livesLeft != null) {
      const nextLives = livesLeft - 1;
      setLivesLeft(nextLives);
      if (nextLives <= 0) {
        finish(false, nextHistory);
      }
    }
  }

  function handleUseClue() {
    if (hintsLeft <= 0 || isEnded || isPaused) return;
    recordSessionHint();
    setHintsLeft((h) => h - 1);
    setHintsUsed((u) => u + 1);
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

            {livesLeft != null ? (
              <View style={styles.hudChip}>
                <Text style={styles.hudLabel}>LIVES</Text>
                <Text style={styles.hudValue}>{livesLeft}</Text>
              </View>
            ) : (
              <View style={styles.hudChip}>
                <Text style={styles.hudLabel}>LIVES</Text>
                <Text style={styles.hudValue}>∞</Text>
              </View>
            )}

            {config.timerSeconds != null ? (
              <View style={styles.hudChip}>
                <Text style={styles.hudLabel}>TIME</Text>
                <Text
                  style={[
                    styles.hudValue,
                    secondsLeft <= 10 && { color: Colors.coral },
                  ]}
                >
                  {secondsLeft}s
                </Text>
              </View>
            ) : null}

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>ATTEMPTS</Text>
              <Text style={styles.hudValue}>{history.length}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Custom Match</Title>
            <SameText muted style={styles.rangeSub}>
              Search Range: {config.min} – {config.max}
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
            min={config.min}
            max={config.max}
            low={low}
            high={high + 1}
          />

          {/* Input & Guess Controls Card */}
          <Card variant="elevated" style={styles.inputCard}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(config.max).length + 1}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter number"
              placeholderTextColor={Colors.textDim}
              selectionColor="#74B9FF"
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
          modeTitle="Custom Sandbox Match"
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
    borderBottomColor: "#74B9FF",
    color: "#74B9FF",
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
