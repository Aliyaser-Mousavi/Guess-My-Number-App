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
  ProximityService,
  type ProximityFeedback,
} from "@/services/proximity/ProximityService";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
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
  isDaily: boolean;
  dailyDateStr?: string;
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

export default function PlayerGuessScreen({
  difficultyId,
  isDaily,
  dailyDateStr,
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
              placeholder="Enter number"
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.accent}
              editable={!isPaused && !isGameOver}
            />
            <View style={styles.actionsRow}>
              <View style={{ flex: 1.6 }}>
                <PrimaryButton
                  variant="accent"
                  onPress={submitGuess}
                  disabled={isPaused || isGameOver}
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
                    disabled={isPaused || isGameOver}
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
});
