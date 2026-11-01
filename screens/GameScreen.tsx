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
  const { buzz, settings } = useGame();
  const { showAlert } = useAppAlert();
  const { width } = useWindowDimensions();

  const startAt = useRef(Date.now()).current;
  const ended = useRef(false);

  const initialGuess = generateRandomBetween(
    difficulty.min,
    difficulty.max + 1,
    userNumber,
  );
  const [currentGuess, setCurrentGuess] = useState(initialGuess);
  const [guessRounds, setGuessRounds] = useState([initialGuess]);
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
      showAlert("Don't lie!", "You know that this is wrong...", [
        { text: "Sorry!", style: "cancel" },
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
    setCurrentGuess(newRandomNumber);
    setGuessRounds((prev) => [newRandomNumber, ...prev]);
  }

  function useHint() {
    if (hintsLeft <= 0) return;
    const midpoint = Math.floor((boundMin + boundMax) / 2);
    const tip =
      userNumber < midpoint
        ? `The number is below ${midpoint}.`
        : `The number is ${midpoint} or higher.`;
    setHintsLeft((h) => h - 1);
    setHintsUsed((h) => h + 1);
    buzz("light");
    showAlert("Hint", tip, [{ text: "Got it" }]);
  }

  const controls = (
    <Card>
      <SameText style={{ marginBottom: 12 }}>Higher or Lower?</SameText>
      <View style={styles.buttonsContainer}>
        <View style={styles.buttonContainer}>
          <PrimaryButton
            variant="secondary"
            onPress={() => nextGuessHandler("lower")}
            icon={<Ionicons name="remove" size={22} color={Colors.text} />}
          >
            Lower
          </PrimaryButton>
        </View>
        <View style={styles.buttonContainer}>
          <PrimaryButton
            variant="primary"
            onPress={() => nextGuessHandler("greater")}
            icon={<Ionicons name="add" size={22} color={Colors.white} />}
          >
            Higher
          </PrimaryButton>
        </View>
      </View>
      {hintsLeft > 0 && (
        <PrimaryButton variant="ghost" onPress={useHint}>
          Use Hint ({hintsLeft} left)
        </PrimaryButton>
      )}
    </Card>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          <View style={styles.hud}>
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>ROUND</Text>
              <Text style={styles.hudValue}>{guessRounds.length}</Text>
            </View>
            {settings.showTimer && (
              <GameTimer running={!ended.current} startAt={startAt} />
            )}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>
                {isDaily ? "DAILY" : difficulty.label.toUpperCase()}
              </Text>
              <Text style={styles.hudValue}>
                {difficulty.min}-{difficulty.max}
              </Text>
            </View>
          </View>

          <Title size="md">{"Oracle's Guess"}</Title>

          {width > 500 ? (
            <View style={{ width: "100%" }}>
              <View style={styles.wideRow}>
                <View style={styles.buttonContainer}>
                  <PrimaryButton
                    variant="secondary"
                    onPress={() => nextGuessHandler("lower")}
                  >
                    Lower
                  </PrimaryButton>
                </View>
                <NumberContainer>{currentGuess}</NumberContainer>
                <View style={styles.buttonContainer}>
                  <PrimaryButton onPress={() => nextGuessHandler("greater")}>
                    Higher
                  </PrimaryButton>
                </View>
              </View>
              {hintsLeft > 0 && (
                <PrimaryButton variant="ghost" onPress={useHint}>
                  Use Hint ({hintsLeft} left)
                </PrimaryButton>
              )}
            </View>
          ) : (
            <>
              <NumberContainer>{currentGuess}</NumberContainer>
              {controls}
            </>
          )}

          {settings.showRangeBar && (
            <RangeBar
              min={difficulty.min}
              max={difficulty.max + 1}
              low={boundMin}
              high={boundMax}
            />
          )}

          <View style={styles.listContainer}>
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
    padding: 20,
    alignItems: "center",
  },
  hud: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  hudChip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  buttonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  buttonContainer: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    paddingTop: 12,
    width: "100%",
  },
  wideRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
});
