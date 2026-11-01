import GameTimer from "@/components/game/GameTimer";
import GuessLogItem from "@/components/game/GuessLogItem";
import NumberContainer from "@/components/game/NumberContainer";
import RangeBar from "@/components/game/RangeBar";
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
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
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
  onGameOver: (payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber: number;
  }) => void;
};

export default function PlayerGuessScreen({
  difficultyId,
  isDaily,
  onGameOver,
}: Props) {
  const difficulty = getDifficulty(difficultyId);
  const { buzz, settings } = useGame();
  const { showAlert } = useAppAlert();
  const startAt = useRef(Date.now()).current;
  const ended = useRef(false);

  const secret = useMemo(
    () =>
      isDaily
        ? getDailyNumber(difficulty.min, difficulty.max)
        : Math.floor(
            Math.random() * (difficulty.max - difficulty.min + 1),
          ) + difficulty.min,
    [difficulty.max, difficulty.min, isDaily],
  );

  const [guess, setGuess] = useState("");
  const [lives, setLives] = useState(difficulty.playerLives);
  const [hintsLeft, setHintsLeft] = useState(difficulty.hints);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [history, setHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(difficulty.min);
  const [high, setHigh] = useState(difficulty.max);

  function finish(won: boolean, nextHistory: GuessEntry[], usedHints: number) {
    if (ended.current) return;
    ended.current = true;
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

  function submitGuess() {
    const value = parseInt(guess, 10);
    if (isNaN(value) || value < difficulty.min || value > difficulty.max) {
      buzz("error");
      showAlert(
        "Invalid",
        `Enter a number between ${difficulty.min} and ${difficulty.max}.`,
      );
      return;
    }

    if (history.some((h) => h.value === value)) {
      showAlert("Already tried", "You already guessed that number.");
      return;
    }

    let result: GuessEntry["result"] = "correct";
    if (value < secret) result = "low";
    else if (value > secret) result = "high";

    const entry: GuessEntry = { value, result };
    const nextHistory = [entry, ...history];
    setHistory(nextHistory);
    setGuess("");

    if (result === "correct") {
      finish(true, nextHistory, hintsUsed);
      return;
    }

    buzz("medium");
    if (result === "low") setLow((l) => Math.max(l, value + 1));
    if (result === "high") setHigh((h) => Math.min(h, value - 1));

    const nextLives = lives - 1;
    setLives(nextLives);
    if (nextLives <= 0) {
      finish(false, nextHistory, hintsUsed);
    }
  }

  function useHint() {
    if (hintsLeft <= 0 || ended.current) return;
    const mid = Math.floor((low + high) / 2);
    const tip =
      secret <= mid
        ? `Secret is ≤ ${mid}`
        : `Secret is ≥ ${mid + 1}`;
    const used = hintsUsed + 1;
    setHintsLeft((h) => h - 1);
    setHintsUsed(used);
    buzz();
    showAlert("Hint", tip);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          <View style={styles.hud}>
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>LIVES</Text>
              <View style={styles.livesRow}>
                {Array.from({ length: difficulty.playerLives }).map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < lives ? "heart" : "heart-outline"}
                    size={14}
                    color={Colors.coral}
                  />
                ))}
              </View>
            </View>
            {settings.showTimer && (
              <GameTimer running={!ended.current} startAt={startAt} />
            )}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>GUESSES</Text>
              <Text style={styles.hudValue}>{history.length}</Text>
            </View>
          </View>

          <Title size="md">Hunt the Number</Title>
          <SameText muted>
            Range {difficulty.min}–{difficulty.max}
          </SameText>

          <NumberContainer label="Your guess">{guess || "?"}</NumberContainer>

          {settings.showRangeBar && (
            <RangeBar
              min={difficulty.min}
              max={difficulty.max}
              low={low}
              high={high + 1}
            />
          )}

          <Card>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={String(difficulty.max).length}
              value={guess}
              onChangeText={setGuess}
              placeholder="Type a guess"
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.accent}
            />
            <PrimaryButton
              variant="accent"
              onPress={submitGuess}
              icon={<Ionicons name="send" size={18} color={Colors.bg} />}
            >
              Guess
            </PrimaryButton>
            {hintsLeft > 0 && (
              <PrimaryButton variant="ghost" onPress={useHint}>
                Hint ({hintsLeft})
              </PrimaryButton>
            )}
          </Card>

          <View style={styles.list}>
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
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: { flex: 1, padding: 20, alignItems: "center" },
  hud: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
    marginBottom: 8,
  },
  hudChip: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  hudLabel: {
    fontFamily: "play-fair",
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1,
  },
  hudValue: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 14,
  },
  livesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 2,
    marginTop: 2,
  },
  input: {
    width: "100%",
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    fontFamily: "play-fair-bold",
    fontSize: 28,
    textAlign: "center",
    paddingVertical: 10,
    marginBottom: 12,
  },
  list: { flex: 1, width: "100%", marginTop: 12 },
});
