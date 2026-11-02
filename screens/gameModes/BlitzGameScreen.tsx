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

const BLITZ_TARGET_COUNT = 10;
const BLITZ_RANGE_MAX = 30; // Fast 1–30 range for rapid solving

export default function BlitzGameScreen({ onGameOver, onAbandon }: Props) {
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
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [solvedCount, setSolvedCount] = useState(0);
  const [totalGuessesCount, setTotalGuessesCount] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const endedRef = useRef(false);

  function generateBlitzNumber(): number {
    return Math.floor(Math.random() * BLITZ_RANGE_MAX) + 1;
  }

  const [secret, setSecret] = useState(() => generateBlitzNumber());
  const [guess, setGuess] = useState("");
  const [currentRoundHistory, setCurrentRoundHistory] = useState<GuessEntry[]>(
    [],
  );
  const [low, setLow] = useState(1);
  const [high, setHigh] = useState(BLITZ_RANGE_MAX);
  const [lastProximity, setLastProximity] = useState<ProximityFeedback | null>(
    null,
  );

  const finishMatch = React.useCallback(
    (wonAllTargets: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setIsEnded(true);
      buzz(wonAllTargets || solvedCount >= 5 ? "success" : "error");
      if (wonAllTargets || solvedCount >= 5) {
        playSound("victory");
      } else {
        playSound("defeat");
      }

      const elapsedMs = Math.min(60000, Date.now() - startAt);
      const score =
        solvedCount * 200 + (wonAllTargets ? secondsRemaining * 30 : 0);

      showAlert(
        wonAllTargets ? "Blitz Master!" : "Blitz Finished!",
        `You solved ${solvedCount} numbers in ${Math.round(elapsedMs / 1000)}s! Total Score: ${score}`,
        [
          {
            text: "View Scorecard",
            onPress: () => {
              onGameOver({
                won: wonAllTargets || solvedCount >= 5,
                rounds: totalGuessesCount,
                elapsedMs,
                hintsUsed: 0,
                guesses: [],
                secretNumber: secret,
                score: Math.max(50, score),
              });
            },
          },
        ],
      );
    },
    [
      buzz,
      playSound,
      onGameOver,
      secondsRemaining,
      secret,
      showAlert,
      solvedCount,
      startAt,
      totalGuessesCount,
    ],
  );

  const finishMatchRef = useRef(finishMatch);
  useEffect(() => {
    finishMatchRef.current = finishMatch;
  }, [finishMatch]);

  // Countdown timer loop - freezes when paused
  useEffect(() => {
    if (isEnded || isPaused) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishMatchRef.current(false);
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
    setSecondsRemaining(60);
    setSolvedCount(0);
    setTotalGuessesCount(0);
    const nextSecret = generateBlitzNumber();
    setSecret(nextSecret);
    setGuess("");
    setCurrentRoundHistory([]);
    setLow(1);
    setHigh(BLITZ_RANGE_MAX);
    setLastProximity(null);

    startSession({
      mode: "blitz",
      difficultyId: "medium",
      isDaily: false,
      targetNumber: nextSecret,
    });
  }

  function submitGuess() {
    if (isEnded || isPaused) return;
    const value = parseInt(guess, 10);
    if (isNaN(value) || value < 1 || value > BLITZ_RANGE_MAX) {
      buzz("error");
      playSound("guess_wrong");
      showAlert("Out of Range", `Enter a number between 1 and ${BLITZ_RANGE_MAX}.`);
      return;
    }

    setTotalGuessesCount((prev) => prev + 1);

    let result: GuessEntry["result"] = "correct";
    if (value < secret) result = "low";
    else if (value > secret) result = "high";

    recordSessionGuess(value, result);
    const entry: GuessEntry = { value, result };
    const nextHistory = [entry, ...currentRoundHistory];
    setCurrentRoundHistory(nextHistory);
    setGuess("");

    const proximity = ProximityService.getProximity(value, secret, 1, BLITZ_RANGE_MAX);
    setLastProximity(proximity);

    if (result === "correct") {
      buzz("success");
      playSound("guess_correct");
      const nextSolved = solvedCount + 1;
      setSolvedCount(nextSolved);

      if (nextSolved >= BLITZ_TARGET_COUNT) {
        finishMatchRef.current(true);
        return;
      }

      // Spawn next number immediately!
      const nextSecret = generateBlitzNumber();
      setSecret(nextSecret);
      setLow(1);
      setHigh(BLITZ_RANGE_MAX);
      setCurrentRoundHistory([]);
      setLastProximity(null);
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

  const isUrgent = secondsRemaining <= 10;

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

            {/* Timer Badge */}
            <View style={[styles.timerBadge, isUrgent && styles.timerBadgeUrgent]}>
              <Ionicons
                name="flash"
                size={18}
                color={isUrgent ? Colors.coral : "#FFA502"}
              />
              <Text style={[styles.timerText, isUrgent && { color: Colors.coral }]}>
                {secondsRemaining}s
              </Text>
            </View>

            {/* Solved Progress Counter */}
            <View style={styles.hudChip}>
              <Text style={styles.hudLabel}>SOLVED</Text>
              <Text style={styles.hudValue}>
                {solvedCount} / {BLITZ_TARGET_COUNT}
              </Text>
            </View>
          </View>

          {/* Heading */}
          <View style={styles.headerArea}>
            <Title size="md">Arcade Blitz</Title>
            <SameText muted style={styles.rangeSub}>
              Solve 10 numbers in 60s! Rapid 1 – {BLITZ_RANGE_MAX} range
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
            min={1}
            max={BLITZ_RANGE_MAX}
            low={low}
            high={high + 1}
          />

          {/* Input & Guess Controls Card */}
          <Card variant="elevated" style={styles.inputCard}>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={2}
              value={guess}
              onChangeText={setGuess}
              placeholder="Enter number"
              placeholderTextColor={Colors.textDim}
              selectionColor="#FFA502"
              editable={!isEnded && !isPaused}
            />
            <PrimaryButton
              variant="accent"
              onPress={submitGuess}
              disabled={isEnded || isPaused}
              icon={<Ionicons name="send" size={17} color={Colors.bg} />}
            >
              Submit Guess
            </PrimaryButton>
          </Card>

          {/* Guess Log History */}
          <View style={styles.listContainer}>
            <Text style={styles.historyHeader}>
              TARGET #{solvedCount + 1} GUESSES ({currentRoundHistory.length})
            </Text>
            <FlatList
              data={currentRoundHistory}
              keyExtractor={(item, i) => `${item.value}-${i}`}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <GuessLogItem
                  roundNumber={currentRoundHistory.length - index}
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

        {/* Anti-Cheat Pause Modal */}
        <PauseModal
          visible={isPaused}
          modeTitle="Arcade Blitz Mode"
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
    borderColor: "#FFA502",
  },
  timerBadgeUrgent: {
    borderColor: Colors.coral,
    backgroundColor: "rgba(255, 82, 82, 0.15)",
  },
  timerText: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    color: "#FFA502",
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
    borderBottomColor: "#FFA502",
    color: "#FFA502",
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
