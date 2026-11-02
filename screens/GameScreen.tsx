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
import { getDifficulty, type DifficultyId } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function generateRandomBetween(
  min: number,
  max: number,
  exclude?: number,
): number {
  if (min >= max) return min;
  const rndNum = Math.floor(Math.random() * (max - min)) + min;
  if (exclude !== undefined && rndNum === exclude) {
    return generateRandomBetween(min, max, exclude);
  }
  return rndNum;
}

type Props = {
  userNumber: number;
  difficultyId: DifficultyId;
  isDaily: boolean;
  onGameOver: (payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
  }) => void;
};

export default function GameScreen({
  userNumber,
  difficultyId,
  isDaily,
  onGameOver,
}: Props) {
  const difficulty = getDifficulty(difficultyId);
  const { buzz, settings, recordSessionGuess, recordSessionHint } = useGame();
  const { showAlert } = useAppAlert();
  const { width } = useWindowDimensions();

  const [startAt] = useState(() => Date.now());
  const ended = useRef(false);

  const [initialGuess] = useState(() =>
    generateRandomBetween(
      difficulty.min,
      difficulty.max + 1,
      userNumber,
    ),
  );
  const [currentGuess, setCurrentGuess] = useState(initialGuess);
  const [guessRounds, setGuessRounds] = useState<number[]>([initialGuess]);
  const [hintsLeft, setHintsLeft] = useState(difficulty.hints);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [boundMin, setBoundMin] = useState(difficulty.min);
  const [boundMax, setBoundMax] = useState(difficulty.max + 1);

  useEffect(() => {
    if (ended.current) return;
    if (currentGuess === userNumber) {
      ended.current = true;
      buzz("success");
      onGameOver({
        won: true,
        rounds: guessRounds.length,
        elapsedMs: Date.now() - startAt,
        hintsUsed,
        guesses: guessRounds,
      });
    }
  }, [
    currentGuess,
    userNumber,
    onGameOver,
    guessRounds,
    buzz,
    startAt,
    hintsUsed,
  ]);

  function nextGuessHandler(direction: "lower" | "greater") {
    if (
      (direction === "lower" && currentGuess < userNumber) ||
      (direction === "greater" && currentGuess > userNumber)
    ) {
      buzz("error");
      showAlert("Honesty Check", "You know that direction is incorrect! Keep it honest for the Oracle.", [
        { text: "My Mistake", style: "cancel" },
      ]);
      return;
    }

    buzz("medium");
    const nextMin = direction === "greater" ? currentGuess + 1 : boundMin;
    const nextMax = direction === "lower" ? currentGuess : boundMax;
    setBoundMin(nextMin);
    setBoundMax(nextMax);

    if (nextMin >= nextMax) {
      ended.current = true;
      onGameOver({
        won: true,
        rounds: guessRounds.length,
        elapsedMs: Date.now() - startAt,
        hintsUsed,
        guesses: guessRounds,
      });
      return;
    }

    const newRandomNumber = generateRandomBetween(
      nextMin,
      nextMax,
      currentGuess,
    );
    recordSessionGuess(newRandomNumber, "oracle");
    setCurrentGuess(newRandomNumber);
    setGuessRounds((prev) => [newRandomNumber, ...prev]);
  }

  function useHint() {
    if (hintsLeft <= 0) return;
    recordSessionHint();
    const midpoint = Math.floor((boundMin + boundMax) / 2);
    const tip =
      userNumber < midpoint
        ? `The secret number is strictly below ${midpoint}.`
        : `The secret number is ${midpoint} or higher.`;
    setHintsLeft((h) => h - 1);
    setHintsUsed((h) => h + 1);
    buzz("light");
    showAlert("Oracle Insight", tip, [{ text: "Got it" }]);
  }

  const controls = (
    <Card variant="elevated" style={styles.controlsCard}>
      <SameText muted style={styles.questionText}>
        Is your number higher or lower than {currentGuess}?
      </SameText>
      <View style={styles.buttonsContainer}>
        <View style={styles.buttonContainer}>
          <PrimaryButton
            variant="secondary"
            onPress={() => nextGuessHandler("lower")}
            icon={<Ionicons name="arrow-down" size={20} color={Colors.coral} />}
          >
            Lower
          </PrimaryButton>
        </View>
        <View style={styles.buttonContainer}>
          <PrimaryButton
            variant="primary"
            onPress={() => nextGuessHandler("greater")}
            icon={<Ionicons name="arrow-up" size={20} color={Colors.bg} />}
          >
            Higher
          </PrimaryButton>
        </View>
      </View>
      {hintsLeft > 0 && (
        <PrimaryButton
          variant="ghost"
          size="sm"
          onPress={useHint}
          icon={<Ionicons name="bulb-outline" size={16} color={Colors.accent} />}
          style={{ marginTop: 8 }}
        >
          Use Oracle Hint ({hintsLeft} left)
        </PrimaryButton>
      )}
    </Card>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          {/* Top HUD Display */}
          <View style={styles.hud}>
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>ROUND</Text>
              <Text style={styles.hudValue}>{guessRounds.length}</Text>
            </View>
            {settings.showTimer && (
              <GameTimer running={true} startAt={startAt} />
            )}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>
                {isDaily ? "DAILY" : difficulty.label.toUpperCase()}
              </Text>
              <Text style={styles.hudValue}>
                {difficulty.min}–{difficulty.max}
              </Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Oracle&apos;s Guess</Title>
            <Text style={styles.headerSub}>
              Round {guessRounds.length} • Narrowing the bounds
            </Text>
          </View>

          {/* Centerpiece Number Display */}
          {width > 500 ? (
            <View style={{ width: "100%" }}>
              <View style={styles.wideRow}>
                <View style={styles.buttonContainer}>
                  <PrimaryButton
                    variant="secondary"
                    onPress={() => nextGuessHandler("lower")}
                    icon={<Ionicons name="arrow-down" size={20} color={Colors.coral} />}
                  >
                    Lower
                  </PrimaryButton>
                </View>
                <NumberContainer label="CURRENT ESTIMATE">
                  {currentGuess}
                </NumberContainer>
                <View style={styles.buttonContainer}>
                  <PrimaryButton
                    variant="primary"
                    onPress={() => nextGuessHandler("greater")}
                    icon={<Ionicons name="arrow-up" size={20} color={Colors.bg} />}
                  >
                    Higher
                  </PrimaryButton>
                </View>
              </View>
              {hintsLeft > 0 && (
                <PrimaryButton
                  variant="ghost"
                  size="sm"
                  onPress={useHint}
                  icon={<Ionicons name="bulb-outline" size={16} color={Colors.accent} />}
                >
                  Use Oracle Hint ({hintsLeft} left)
                </PrimaryButton>
              )}
            </View>
          ) : (
            <>
              <NumberContainer label="CURRENT ESTIMATE">
                {currentGuess}
              </NumberContainer>
              {controls}
            </>
          )}

          {/* Search Range Bar */}
          {settings.showRangeBar && (
            <RangeBar
              min={difficulty.min}
              max={difficulty.max + 1}
              low={boundMin}
              high={boundMax}
            />
          )}

          {/* Guess Log History */}
          <View style={styles.listContainer}>
            <Text style={styles.historyHeader}>GUESS HISTORY</Text>
            <FlatList
              data={guessRounds}
              renderItem={(itemData) => (
                <GuessLogItem
                  roundNumber={guessRounds.length - itemData.index}
                  guess={itemData.item}
                  note="oracle"
                />
              )}
              keyExtractor={(item, index) => `${item}-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            />
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "center",
  },
  hud: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  hudChip: {
    flex: 1,
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
    color: Colors.textDim,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  hudValue: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  headerArea: {
    alignItems: "center",
    marginVertical: 4,
  },
  headerSub: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  controlsCard: {
    padding: 16,
    marginVertical: 6,
  },
  questionText: {
    fontSize: 13,
    marginBottom: 10,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  buttonContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingTop: 8,
    width: "100%",
  },
  historyHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingLeft: 2,
  },
  wideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
});
