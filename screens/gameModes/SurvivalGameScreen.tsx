import GuessLogItem from "@/components/game/GuessLogItem";
import NumberContainer from "@/components/game/NumberContainer";
import PauseModal from "@/components/game/PauseModal";
import ProximityIndicator from "@/components/game/ProximityIndicator";
import RangeBar from "@/components/game/RangeBar";
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

// Progressive survival range tiers
function getRangeForLevel(level: number): { min: number; max: number } {
  if (level === 1) return { min: 1, max: 25 };
  if (level === 2) return { min: 1, max: 50 };
  if (level === 3) return { min: 1, max: 100 };
  if (level === 4) return { min: 1, max: 200 };
  if (level === 5) return { min: 1, max: 400 };
  if (level === 6) return { min: 1, max: 650 };
  return { min: 1, max: 1000 };
}

export default function SurvivalGameScreen({ onGameOver, onAbandon }: Props) {
  const {
    buzz,
    playSound,
    settings,
    recordSessionGuess,
    abandonSession,
    startSession,
  } = useGame();
  const { showAlert } = useAppAlert();

  const [startAt, setStartAt] = useState(() => Date.now());
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(5);
  const [cumulativeScore, setCumulativeScore] = useState(0);
  const [totalRoundsCompleted, setTotalRoundsCompleted] = useState(0);
  const [allGuesses, setAllGuesses] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const currentRange = getRangeForLevel(level);

  function generateTarget(range: { min: number; max: number }) {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  const [secret, setSecret] = useState(() => generateTarget(currentRange));
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(currentRange.min);
  const [high, setHigh] = useState(currentRange.max);
  const [lastProximity, setLastProximity] = useState<ProximityFeedback | null>(
    null,
  );
  const endedRef = useRef(false);

  function handleRestart() {
    abandonSession();
    endedRef.current = false;
    setIsPaused(false);
    setStartAt(Date.now());
    setLevel(1);
    setLives(5);
    setCumulativeScore(0);
    setTotalRoundsCompleted(0);
    setAllGuesses([]);
    const range1 = getRangeForLevel(1);
    const nextSecret = generateTarget(range1);
    setSecret(nextSecret);
    setLow(range1.min);
    setHigh(range1.max);
    setHistory([]);
    setGuess("");
    setLastProximity(null);

    startSession({
      mode: "survival",
      difficultyId: "medium",
      isDaily: false,
      targetNumber: nextSecret,
    });
  }

  function advanceToNextLevel() {
    buzz("success");
    playSound("guess_correct");
    const nextLevel = level + 1;
    const nextLives = Math.min(5, lives + 1); // +1 life reward for surviving
    const earnedScore = level * 250 + nextLives * 30;
    const newCumulative = cumulativeScore + earnedScore;

    showAlert(
      `Level ${level} Cleared!`,
      `+${earnedScore} PTS • Restored +1 Life (${nextLives}/5)! Advancing to Level ${nextLevel}...`,
      [
        {
          text: "Next Level",
          onPress: () => {
            setLevel(nextLevel);
            setLives(nextLives);
            setCumulativeScore(newCumulative);
            setTotalRoundsCompleted((r) => r + 1);

            const nextRange = getRangeForLevel(nextLevel);
            setSecret(generateTarget(nextRange));
            setLow(nextRange.min);
            setHigh(nextRange.max);
            setHistory([]);
            setGuess("");
            setLastProximity(null);
          },
        },
      ],
    );
  }

  function handleGameOver() {
    if (endedRef.current) return;
    endedRef.current = true;
    buzz("error");
    playSound("defeat");

    const elapsedMs = Date.now() - startAt;
    onGameOver({
      won: level >= 3, // Count as victory if survived past early tiers
      rounds: totalRoundsCompleted + history.length,
      elapsedMs,
      hintsUsed: 0,
      guesses: allGuesses,
      secretNumber: secret,
      score: Math.max(100, cumulativeScore),
    });
  }

  function submitGuess() {
    if (isPaused || endedRef.current) return;
    const value = parseInt(guess, 10);
    if (isNaN(value) || value < currentRange.min || value > currentRange.max) {
      buzz("error");
      playSound("guess_wrong");
      showAlert(
        "Invalid Range",
        `Enter a number between ${currentRange.min} and ${currentRange.max}.`,
      );
      return;
    }

    if (history.some((h) => h.value === value)) {
      buzz("error");
      playSound("guess_wrong");
      showAlert("Already Guessed", `You already tried ${value}.`);
      return;
    }

    setAllGuesses((prev) => [...prev, value]);

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
      currentRange.min,
      currentRange.max,
    );
    setLastProximity(proximity);

    if (result === "correct") {
      advanceToNextLevel();
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
      handleGameOver();
    }
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

            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Ionicons name="shield-checkmark" size={16} color={Colors.mint} />
              <Text style={styles.levelText}>LVL {level}</Text>
            </View>

            {/* Shared Lives (Max 5) */}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>LIVES</Text>
              <View style={styles.livesRow}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < lives ? "heart" : "heart-outline"}
                    size={14}
                    color={i < lives ? Colors.coral : Colors.textDim}
                  />
                ))}
              </View>
            </View>

            {/* Total Run Score */}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>SCORE</Text>
              <Text style={styles.hudValue}>{cumulativeScore}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Survival Gauntlet</Title>
            <SameText muted style={styles.rangeSub}>
              Tier {level}: Range {currentRange.min} – {currentRange.max}
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
            min={currentRange.min}
            max={currentRange.max}
            low={low}
            high={high + 1}
          />

          {/* Input & Guess Controls Card */}
          <Card variant="elevated" style={styles.inputCard}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(currentRange.max).length}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter number"
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.mint}
              editable={!isPaused}
            />
            <PrimaryButton
              variant="accent"
              onPress={submitGuess}
              disabled={isPaused}
              icon={<Ionicons name="send" size={17} color={Colors.bg} />}
            >
              Submit Guess
            </PrimaryButton>
          </Card>

          {/* Guess Log History */}
          <View style={styles.listContainer}>
            <Text style={styles.historyHeader}>
              LEVEL {level} ATTEMPTS ({history.length})
            </Text>
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
                      ? "solved!"
                      : item.result === "low"
                        ? "too low"
                        : "too high"
                  }
                />
              )}
            />
          </View>
        </View>

        {/* Anti-Cheat Pause Modal */}
        <PauseModal
          visible={isPaused}
          modeTitle={`Survival Gauntlet (Level ${level})`}
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
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: "rgba(61, 220, 151, 0.15)",
    borderWidth: 1.5,
    borderColor: Colors.mint,
  },
  levelText: {
    fontFamily: FontFamily.display,
    fontSize: 14,
    color: Colors.mint,
  },
  hudChip: {
    paddingHorizontal: 10,
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
  livesRow: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
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
    borderBottomColor: Colors.mint,
    color: Colors.mint,
    fontFamily: FontFamily.display,
    textAlign: "center",
    marginBottom: 12,
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
