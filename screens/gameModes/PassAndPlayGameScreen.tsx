import GuessLogItem from "@/components/game/GuessLogItem";
import NumberContainer from "@/components/game/NumberContainer";
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
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GuessEntry = { value: number; result: "low" | "high" | "correct" };

type Phase =
  | "p1_set" // Player 1 secretly enters target
  | "handoff_to_p2" // Privacy handoff curtain
  | "p2_guess" // Player 2 hunting Player 1's target
  | "handoff_to_p1_set" // Player 2 solved! Handoff to Player 2 to set target
  | "p2_set" // Player 2 secretly enters target
  | "handoff_to_p1" // Privacy handoff curtain
  | "p1_guess" // Player 1 hunting Player 2's target
  | "match_result"; // Final winner reveal!

type Props = {
  player1Name?: string;
  player2Name?: string;
  onGameOver: (payload: {
    won: boolean;
    rounds: number;
    elapsedMs: number;
    hintsUsed: number;
    guesses: number[];
    secretNumber: number;
    score: number;
  }) => void;
  onBack: () => void;
};

const PASS_RANGE_MIN = 1;
const PASS_RANGE_MAX = 100;

export default function PassAndPlayGameScreen({
  player1Name = "Player 1",
  player2Name = "Player 2",
  onGameOver,
  onBack,
}: Props) {
  const { buzz } = useGame();
  const { showAlert } = useAppAlert();

  const [phase, setPhase] = useState<Phase>("p1_set");

  // Player 1's secret (Player 2 will hunt)
  const [p1Secret, setP1Secret] = useState<number | null>(null);
  // Player 2's secret (Player 1 will hunt)
  const [p2Secret, setP2Secret] = useState<number | null>(null);

  // Stats for Player 2's turn
  const [p2Attempts, setP2Attempts] = useState(0);
  const [p2ElapsedSec, setP2ElapsedSec] = useState(0);

  // Stats for Player 1's turn
  const [p1Attempts, setP1Attempts] = useState(0);
  const [p1ElapsedSec, setP1ElapsedSec] = useState(0);

  // Turn active input & history
  const [inputVal, setInputVal] = useState("");
  const [activeHistory, setActiveHistory] = useState<GuessEntry[]>([]);
  const [low, setLow] = useState(PASS_RANGE_MIN);
  const [high, setHigh] = useState(PASS_RANGE_MAX);
  const turnStartRef = useRef<number>(0);

  // --- Phase 1: Player 1 sets secret ---
  function lockInP1Secret() {
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < PASS_RANGE_MIN || val > PASS_RANGE_MAX) {
      buzz("error");
      showAlert("Invalid", `Enter a number between ${PASS_RANGE_MIN} and ${PASS_RANGE_MAX}.`);
      return;
    }
    buzz("success");
    setP1Secret(val);
    setInputVal("");
    setPhase("handoff_to_p2");
  }

  // --- Start Player 2's hunt ---
  function startP2Hunting() {
    buzz("light");
    setActiveHistory([]);
    setLow(PASS_RANGE_MIN);
    setHigh(PASS_RANGE_MAX);
    turnStartRef.current = Date.now();
    setPhase("p2_guess");
  }

  // --- Phase 2: Player 2 submits a guess ---
  function submitP2Guess() {
    if (p1Secret == null) return;
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < PASS_RANGE_MIN || val > PASS_RANGE_MAX) {
      buzz("error");
      showAlert("Invalid", `Enter a number between ${PASS_RANGE_MIN} and ${PASS_RANGE_MAX}.`);
      return;
    }

    let result: GuessEntry["result"] = "correct";
    if (val < p1Secret) result = "low";
    else if (val > p1Secret) result = "high";

    const nextHistory = [{ value: val, result }, ...activeHistory];
    setActiveHistory(nextHistory);
    setInputVal("");

    if (result === "correct") {
      buzz("success");
      const elapsed = Math.round((Date.now() - turnStartRef.current) / 1000);
      setP2Attempts(nextHistory.length);
      setP2ElapsedSec(elapsed);
      setPhase("handoff_to_p1_set");
      return;
    }

    buzz("medium");
    if (result === "low") setLow((l) => Math.max(l, val + 1));
    if (result === "high") setHigh((h) => Math.min(h, val - 1));
  }

  // --- Phase 3: Player 2 sets secret ---
  function lockInP2Secret() {
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < PASS_RANGE_MIN || val > PASS_RANGE_MAX) {
      buzz("error");
      showAlert("Invalid", `Enter a number between ${PASS_RANGE_MIN} and ${PASS_RANGE_MAX}.`);
      return;
    }
    buzz("success");
    setP2Secret(val);
    setInputVal("");
    setPhase("handoff_to_p1");
  }

  // --- Start Player 1's hunt ---
  function startP1Hunting() {
    buzz("light");
    setActiveHistory([]);
    setLow(PASS_RANGE_MIN);
    setHigh(PASS_RANGE_MAX);
    turnStartRef.current = Date.now();
    setPhase("p1_guess");
  }

  // --- Phase 4: Player 1 submits a guess ---
  function submitP1Guess() {
    if (p2Secret == null) return;
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < PASS_RANGE_MIN || val > PASS_RANGE_MAX) {
      buzz("error");
      showAlert("Invalid", `Enter a number between ${PASS_RANGE_MIN} and ${PASS_RANGE_MAX}.`);
      return;
    }

    let result: GuessEntry["result"] = "correct";
    if (val < p2Secret) result = "low";
    else if (val > p2Secret) result = "high";

    const nextHistory = [{ value: val, result }, ...activeHistory];
    setActiveHistory(nextHistory);
    setInputVal("");

    if (result === "correct") {
      buzz("success");
      const elapsed = Math.round((Date.now() - turnStartRef.current) / 1000);
      setP1Attempts(nextHistory.length);
      setP1ElapsedSec(elapsed);
      setPhase("match_result");
      return;
    }

    buzz("medium");
    if (result === "low") setLow((l) => Math.max(l, val + 1));
    if (result === "high") setHigh((h) => Math.min(h, val - 1));
  }

  // Calculate winner
  let winner = "Tie";
  if (p1Attempts < p2Attempts) winner = player1Name;
  else if (p2Attempts < p1Attempts) winner = player2Name;
  else {
    // Tiebreak on time
    if (p1ElapsedSec < p2ElapsedSec) winner = player1Name;
    else if (p2ElapsedSec < p1ElapsedSec) winner = player2Name;
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.screen}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Title size="md">Pass & Play</Title>
            <Text style={styles.subtext}>
              {player1Name} vs {player2Name}
            </Text>
          </View>

          {/* Privacy Handoff Curtains */}
          {phase === "handoff_to_p2" && (
            <Card variant="elevated" style={styles.handoffCard}>
              <View style={styles.privacyBadge}>
                <Ionicons name="lock-closed" size={32} color={Colors.accent} />
              </View>
              <Title size="lg">PASS DEVICE</Title>
              <Text style={styles.handoffNotice}>
                Pass the device to <Text style={{ color: Colors.accent }}>{player2Name}</Text>.
                Make sure {player1Name} cannot see the screen!
              </Text>
              <PrimaryButton
                variant="accent"
                size="lg"
                onPress={startP2Hunting}
                icon={<Ionicons name="eye-outline" size={20} color={Colors.bg} />}
                style={{ marginTop: 20 }}
              >
                I am {player2Name} • Ready
              </PrimaryButton>
            </Card>
          )}

          {phase === "handoff_to_p1_set" && (
            <Card variant="elevated" style={styles.handoffCard}>
              <View style={styles.privacyBadge}>
                <Ionicons name="checkmark-circle" size={32} color={Colors.mint} />
              </View>
              <Title size="md">{`${player2Name} Solved It!`}</Title>
              <Text style={styles.handoffNotice}>
                {player2Name} finished in {p2Attempts} attempts ({p2ElapsedSec}s).
                Now pass device to {player2Name} to pick their secret number for {player1Name}.
              </Text>
              <PrimaryButton
                variant="primary"
                size="lg"
                onPress={() => {
                  buzz("light");
                  setInputVal("");
                  setPhase("p2_set");
                }}
                style={{ marginTop: 20 }}
              >
                Set {player2Name}&apos;s Secret
              </PrimaryButton>
            </Card>
          )}

          {phase === "handoff_to_p1" && (
            <Card variant="elevated" style={styles.handoffCard}>
              <View style={styles.privacyBadge}>
                <Ionicons name="lock-closed" size={32} color={Colors.primary} />
              </View>
              <Title size="lg">PASS DEVICE</Title>
              <Text style={styles.handoffNotice}>
                Pass the device back to <Text style={{ color: Colors.primary }}>{player1Name}</Text>.
                {player2Name}&apos;s secret is locked in!
              </Text>
              <PrimaryButton
                variant="primary"
                size="lg"
                onPress={startP1Hunting}
                icon={<Ionicons name="eye-outline" size={20} color={Colors.bg} />}
                style={{ marginTop: 20 }}
              >
                I am {player1Name} • Ready
              </PrimaryButton>
            </Card>
          )}

          {/* Player 1 Set Secret */}
          {phase === "p1_set" && (
            <Card variant="elevated" style={styles.setCard}>
              <Text style={styles.phaseHeader}>{player1Name.toUpperCase()}: ENTER SECRET</Text>
              <SameText muted style={{ marginBottom: 12 }}>
                Pick a number ({PASS_RANGE_MIN}–{PASS_RANGE_MAX}) for {player2Name} to hunt.
              </SameText>
              <TextInput
                style={styles.secretInput}
                keyboardType="number-pad"
                maxLength={3}
                value={inputVal}
                onChangeText={setInputVal}
                placeholder="?"
                placeholderTextColor={Colors.textDim}
                selectionColor={Colors.accent}
                secureTextEntry={false}
              />
              <PrimaryButton
                variant="accent"
                size="lg"
                onPress={lockInP1Secret}
                disabled={!inputVal.trim()}
                icon={<Ionicons name="lock-closed" size={18} color={Colors.bg} />}
              >
                Lock In Secret Number
              </PrimaryButton>
            </Card>
          )}

          {/* Player 2 Set Secret */}
          {phase === "p2_set" && (
            <Card variant="elevated" style={styles.setCard}>
              <Text style={styles.phaseHeader}>{player2Name.toUpperCase()}: ENTER SECRET</Text>
              <SameText muted style={{ marginBottom: 12 }}>
                Pick a number ({PASS_RANGE_MIN}–{PASS_RANGE_MAX}) for {player1Name} to hunt.
              </SameText>
              <TextInput
                style={styles.secretInput}
                keyboardType="number-pad"
                maxLength={3}
                value={inputVal}
                onChangeText={setInputVal}
                placeholder="?"
                placeholderTextColor={Colors.textDim}
                selectionColor={Colors.primary}
              />
              <PrimaryButton
                variant="primary"
                size="lg"
                onPress={lockInP2Secret}
                disabled={!inputVal.trim()}
                icon={<Ionicons name="lock-closed" size={18} color={Colors.bg} />}
              >
                Lock In Secret Number
              </PrimaryButton>
            </Card>
          )}

          {/* Player 2 Guessing or Player 1 Guessing */}
          {(phase === "p2_guess" || phase === "p1_guess") && (
            <>
              <View style={styles.turnBanner}>
                <Ionicons name="person" size={16} color={Colors.accent} />
                <Text style={styles.turnBannerText}>
                  {phase === "p2_guess" ? `${player2Name}'s Turn` : `${player1Name}'s Turn`}
                </Text>
              </View>

              <NumberContainer label="YOUR CURRENT GUESS">
                {inputVal ? inputVal : "?"}
              </NumberContainer>

              <RangeBar
                min={PASS_RANGE_MIN}
                max={PASS_RANGE_MAX}
                low={low}
                high={high + 1}
              />

              <Card variant="elevated" style={styles.inputCard}>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={3}
                  value={inputVal}
                  onChangeText={setInputVal}
                  placeholder="Enter guess"
                  placeholderTextColor={Colors.textDim}
                  selectionColor={Colors.accent}
                />
                <PrimaryButton
                  variant="accent"
                  onPress={phase === "p2_guess" ? submitP2Guess : submitP1Guess}
                  disabled={!inputVal.trim()}
                  icon={<Ionicons name="send" size={17} color={Colors.bg} />}
                >
                  Submit Guess
                </PrimaryButton>
              </Card>

              <View style={styles.listContainer}>
                <Text style={styles.historyHeader}>ATTEMPTS ({activeHistory.length})</Text>
                <FlatList
                  data={activeHistory}
                  keyExtractor={(item, i) => `${item.value}-${i}`}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => (
                    <GuessLogItem
                      roundNumber={activeHistory.length - index}
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
            </>
          )}

          {/* Match Results */}
          {phase === "match_result" && (
            <Card variant="accent" style={styles.resultCard}>
              <View style={styles.trophyIconWrap}>
                <Ionicons name="trophy" size={36} color={Colors.accent} />
              </View>
              <Title size="xl">
                {winner === "Tie" ? "It's a Tie!" : `${winner} Wins!`}
              </Title>

              <View style={styles.scoreComparison}>
                <View style={styles.playerResultColumn}>
                  <Text style={styles.playerResultName}>{player1Name}</Text>
                  <Text style={styles.resultAttempts}>{p1Attempts} tries</Text>
                  <Text style={styles.resultTime}>{p1ElapsedSec}s</Text>
                </View>

                <View style={styles.vsDivider}>
                  <Text style={styles.vsText}>VS</Text>
                </View>

                <View style={styles.playerResultColumn}>
                  <Text style={styles.playerResultName}>{player2Name}</Text>
                  <Text style={styles.resultAttempts}>{p2Attempts} tries</Text>
                  <Text style={styles.resultTime}>{p2ElapsedSec}s</Text>
                </View>
              </View>

              <PrimaryButton
                variant="accent"
                size="lg"
                onPress={() => {
                  buzz("success");
                  onGameOver({
                    won: true,
                    rounds: p1Attempts + p2Attempts,
                    elapsedMs: (p1ElapsedSec + p2ElapsedSec) * 1000,
                    hintsUsed: 0,
                    guesses: [],
                    secretNumber: p2Secret ?? 50,
                    score: 500,
                  });
                }}
                style={{ marginTop: 20 }}
              >
                Record Match
              </PrimaryButton>

              <PrimaryButton
                variant="secondary"
                onPress={onBack}
                style={{ marginTop: 8 }}
              >
                Exit to Menu
              </PrimaryButton>
            </Card>
          )}
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
  headerRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  subtext: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  handoffCard: {
    alignItems: "center",
    padding: 24,
    marginTop: 40,
  },
  privacyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  handoffNotice: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  setCard: {
    alignItems: "center",
    padding: 20,
    marginTop: 24,
  },
  phaseHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  secretInput: {
    width: "100%",
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    fontFamily: FontFamily.display,
    fontSize: 44,
    textAlign: "center",
    paddingVertical: 10,
    marginVertical: 18,
    fontVariant: ["tabular-nums"],
  },
  turnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    marginBottom: 4,
  },
  turnBannerText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  inputCard: {
    padding: 14,
    marginVertical: 6,
    alignItems: "center",
  },
  input: {
    width: "100%",
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    fontFamily: FontFamily.display,
    fontSize: 32,
    textAlign: "center",
    paddingVertical: 6,
    marginBottom: 10,
    fontVariant: ["tabular-nums"],
  },
  listContainer: {
    flex: 1,
    width: "100%",
    paddingTop: 8,
  },
  historyHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingLeft: 2,
  },
  resultCard: {
    alignItems: "center",
    padding: 24,
    marginTop: 24,
  },
  trophyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  scoreComparison: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginVertical: 16,
    paddingHorizontal: 10,
  },
  playerResultColumn: {
    alignItems: "center",
    flex: 1,
  },
  playerResultName: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 15,
  },
  resultAttempts: {
    fontFamily: FontFamily.display,
    color: Colors.accent,
    fontSize: 22,
    marginTop: 4,
  },
  resultTime: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 13,
  },
  vsDivider: {
    paddingHorizontal: 10,
  },
  vsText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 13,
    letterSpacing: 2,
  },
});
