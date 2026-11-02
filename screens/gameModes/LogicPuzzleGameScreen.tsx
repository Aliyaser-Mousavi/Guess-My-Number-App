import PauseModal from "@/components/game/PauseModal";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SameText from "@/components/ui/SameText";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { type DifficultyId } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import {
  LogicPuzzleService,
  type LogicPuzzle,
} from "@/services/puzzle/LogicPuzzleService";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  difficultyId: DifficultyId;
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

export default function LogicPuzzleGameScreen({
  difficultyId,
  onGameOver,
  onAbandon,
}: Props) {
  const {
    buzz,
    playSound,
    recordSessionGuess,
    recordSessionHint,
    abandonSession,
    startSession,
  } = useGame();
  const { showAlert } = useAppAlert();

  const [startAt, setStartAt] = useState(() => Date.now());
  const [puzzle, setPuzzle] = useState<LogicPuzzle>(() =>
    LogicPuzzleService.generatePuzzle(difficultyId),
  );

  // Player starts with 2 revealed clues, can unlock more
  const [revealedCount, setRevealedCount] = useState(2);
  const [attempts, setAttempts] = useState(0);
  const [guess, setGuess] = useState("");
  const [lives, setLives] = useState(4);
  const [guessesHistory, setGuessesHistory] = useState<number[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const endedRef = useRef(false);

  const cluesTotal = puzzle.clues.length;
  const revealedClues = puzzle.clues.slice(0, revealedCount);

  function handleRestart() {
    abandonSession();
    endedRef.current = false;
    setIsPaused(false);
    setStartAt(Date.now());
    const nextPuzzle = LogicPuzzleService.generatePuzzle(difficultyId);
    setPuzzle(nextPuzzle);
    setRevealedCount(2);
    setAttempts(0);
    setGuess("");
    setLives(4);
    setGuessesHistory([]);

    startSession({
      mode: "logicPuzzle",
      difficultyId,
      isDaily: false,
      targetNumber: nextPuzzle.target,
    });
  }

  function unlockNextClue() {
    if (isPaused || endedRef.current) return;
    if (revealedCount >= cluesTotal) {
      buzz("error");
      playSound("guess_wrong");
      showAlert("All Clues Revealed", "You already have all available clues for this puzzle.");
      return;
    }
    buzz("light");
    playSound("button_click");
    recordSessionHint();
    setRevealedCount((c) => Math.min(cluesTotal, c + 1));
  }

  function submitSolution() {
    if (isPaused || endedRef.current) return;
    const val = parseInt(guess, 10);
    if (isNaN(val) || val < puzzle.min || val > puzzle.max) {
      buzz("error");
      playSound("guess_wrong");
      showAlert("Invalid", `Enter a number between ${puzzle.min} and ${puzzle.max}.`);
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setGuessesHistory((prev) => [...prev, val]);
    recordSessionGuess(val, val === puzzle.target ? "correct" : "oracle");
    setGuess("");

    if (val === puzzle.target) {
      if (endedRef.current) return;
      endedRef.current = true;
      buzz("success");
      playSound("victory");

      const elapsedMs = Date.now() - startAt;
      const extraCluesUsed = revealedCount - 2;
      const score = Math.max(
        150,
        800 - extraCluesUsed * 100 - (nextAttempts - 1) * 75,
      );

      showAlert(
        "Puzzle Solved!",
        `Brilliant deduction! The secret number is indeed ${puzzle.target}. Score: ${score}`,
        [
          {
            text: "View Results",
            onPress: () => {
              onGameOver({
                won: true,
                rounds: nextAttempts,
                elapsedMs,
                hintsUsed: extraCluesUsed,
                guesses: [...guessesHistory, val],
                secretNumber: puzzle.target,
                score,
              });
            },
          },
        ],
      );
      return;
    }

    // Incorrect deduction
    buzz("medium");
    playSound("guess_wrong");
    const nextLives = lives - 1;
    setLives(nextLives);

    if (nextLives <= 0) {
      if (endedRef.current) return;
      endedRef.current = true;
      buzz("error");
      playSound("defeat");

      const elapsedMs = Date.now() - startAt;
      showAlert(
        "Out of Deductions!",
        `The clues pointed uniquely to ${puzzle.target}. Review the clues and try another puzzle!`,
        [
          {
            text: "View Summary",
            onPress: () => {
              onGameOver({
                won: false,
                rounds: nextAttempts,
                elapsedMs,
                hintsUsed: revealedCount - 2,
                guesses: [...guessesHistory, val],
                secretNumber: puzzle.target,
                score: 50,
              });
            },
          },
        ],
      );
      return;
    }

    showAlert(
      "Incorrect Deduction",
      `${val} does not satisfy all clues. Review the clue notebook! (${nextLives} lives left)`,
    );
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < lives ? "heart" : "heart-outline"}
                    size={14}
                    color={i < lives ? Colors.coral : Colors.textDim}
                  />
                ))}
              </View>
            </View>

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>CLUES</Text>
              <Text style={styles.hudValue}>
                {revealedCount} / {cluesTotal}
              </Text>
            </View>

            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>ATTEMPTS</Text>
              <Text style={styles.hudValue}>{attempts}</Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Logic Deduction</Title>
            <SameText muted style={styles.subtext}>
              Range: {puzzle.min} – {puzzle.max} • Find the single number matching all clues
            </SameText>
          </View>

          {/* Clue Notebook Scroll */}
          <ScrollView
            style={styles.cluesList}
            contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {revealedClues.map((clue, idx) => (
              <Card key={clue.id} variant="elevated" style={styles.clueCard}>
                <View style={styles.clueHeaderRow}>
                  <View style={styles.clueTag}>
                    <Ionicons
                      name={
                        clue.category === "parity"
                          ? "barcode-outline"
                          : clue.category === "divisibility"
                            ? "calculator-outline"
                            : clue.category === "digits"
                              ? "keypad-outline"
                              : clue.category === "range"
                                ? "locate"
                                : "bulb"
                      }
                      size={14}
                      color="#9C88FF"
                    />
                    <Text style={styles.clueTagText}>CLUE #{idx + 1}</Text>
                  </View>
                  <Text style={styles.clueCategory}>{clue.category.toUpperCase()}</Text>
                </View>
                <Text style={styles.clueText}>{clue.text}</Text>
              </Card>
            ))}

            {revealedCount < cluesTotal && (
              <PrimaryButton
                variant="ghost"
                size="sm"
                onPress={unlockNextClue}
                disabled={isPaused}
                icon={<Ionicons name="sparkles" size={16} color={Colors.accent} />}
              >
                Unlock Extra Clue ({cluesTotal - revealedCount} remaining)
              </PrimaryButton>
            )}
          </ScrollView>

          {/* Solution Submission Card */}
          <Card variant="accent" style={styles.submissionCard}>
            <Text style={styles.inputLabel}>ENTER DEDUCED NUMBER</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(puzzle.max).length}
              value={guess}
              onChangeText={setGuess}
              placeholder="?"
              placeholderTextColor={Colors.textDim}
              selectionColor="#9C88FF"
              editable={!isPaused}
            />
            <PrimaryButton
              variant="accent"
              size="lg"
              onPress={submitSolution}
              disabled={isPaused || !guess.trim()}
              icon={<Ionicons name="checkmark-circle" size={18} color={Colors.bg} />}
            >
              Verify Deduction
            </PrimaryButton>
          </Card>
        </View>

        {/* Anti-Cheat Pause Modal */}
        <PauseModal
          visible={isPaused}
          modeTitle="Logic Puzzle Mode"
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
  subtext: { fontSize: 12, marginTop: 2, textAlign: "center" },
  cluesList: {
    flex: 1,
    marginVertical: 10,
  },
  clueCard: {
    padding: 14,
  },
  clueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(156, 136, 255, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.xs,
  },
  clueTagText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: "#9C88FF",
    letterSpacing: 1,
  },
  clueCategory: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1,
  },
  clueText: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  submissionCard: {
    padding: 16,
    marginTop: 6,
    marginBottom: 10,
    alignItems: "center",
  },
  inputLabel: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    width: 120,
    height: 48,
    fontSize: 32,
    borderBottomWidth: 2,
    borderBottomColor: "#9C88FF",
    color: "#9C88FF",
    fontFamily: FontFamily.display,
    textAlign: "center",
    marginBottom: 12,
  },
});
