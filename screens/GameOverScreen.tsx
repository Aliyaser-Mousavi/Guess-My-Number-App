import { formatElapsed } from "@/components/game/GameTimer";
import ConfettiBurst from "@/components/ui/ConfettiBurst";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { ACHIEVEMENTS, getDifficulty } from "@/constants/gameConfig";
import { useGame } from "@/context/GameProvider";
import type { GameResult } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  result: GameResult;
  onReplay: () => void;
  onHome: () => void;
};

export default function GameOverScreen({ result, onReplay, onHome }: Props) {
  const { newlyUnlocked, clearNewlyUnlocked, buzz } = useGame();
  const { width, height } = useWindowDimensions();
  const difficulty = getDifficulty(result.difficulty);
  const orb = Math.min(220, width * 0.45, height < 500 ? 120 : 200);

  useEffect(() => {
    if (result.won) buzz("success");
  }, [result.won, buzz]);

  useEffect(() => {
    return () => clearNewlyUnlocked();
  }, [clearNewlyUnlocked]);

  return (
    <ScreenBackground>
      <ConfettiBurst active={result.won} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Title size="xl">{result.won ? "Victory!" : "So Close"}</Title>
          <Text style={styles.sub}>
            {result.won
              ? "The number has been revealed."
              : "The oracle keeps its secret… for now."}
          </Text>

          <View
            style={[
              styles.orb,
              {
                width: orb,
                height: orb,
                borderRadius: orb / 2,
                borderColor: result.won ? Colors.accent : Colors.coral,
              },
            ]}
          >
            <Text style={styles.orbLabel}>NUMBER</Text>
            <Text
              style={[
                styles.orbValue,
                { fontSize: orb > 160 ? 56 : 36 },
              ]}
            >
              {result.mode === "player"
                ? result.secretNumber ?? result.userNumber
                : result.userNumber}
            </Text>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{result.score}</Text>
          </View>

          <View style={styles.grid}>
            <Metric label="Rounds" value={String(result.rounds)} />
            <Metric label="Time" value={formatElapsed(result.elapsedMs)} />
            <Metric label="Mode" value={result.mode === "player" ? "You" : "Oracle"} />
            <Metric label="Level" value={difficulty.label} />
          </View>

          {newlyUnlocked.length > 0 && (
            <View style={styles.achievements}>
              <Text style={styles.achTitle}>New badges unlocked!</Text>
              {newlyUnlocked.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <View key={id} style={styles.achRow}>
                    <Ionicons name="ribbon" size={18} color={Colors.accent} />
                    <Text style={styles.achText}>{a.title}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <PrimaryButton variant="accent" onPress={onReplay}>
            Play Again
          </PrimaryButton>
          <PrimaryButton variant="secondary" onPress={onHome}>
            Back Home
          </PrimaryButton>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 24,
    alignItems: "center",
    paddingBottom: 40,
  },
  sub: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },
  orb: {
    borderWidth: 3,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  orbLabel: {
    fontFamily: "play-fair",
    color: Colors.textDim,
    letterSpacing: 2,
    fontSize: 11,
  },
  orbValue: {
    fontFamily: "play-fair-bold",
    color: Colors.accent,
  },
  scoreCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  scoreLabel: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    letterSpacing: 2,
    fontSize: 12,
  },
  scoreValue: {
    fontFamily: "play-fair-bold",
    color: Colors.accent,
    fontSize: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  metric: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricLabel: {
    fontFamily: "play-fair",
    color: Colors.textDim,
    fontSize: 12,
  },
  metricValue: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 18,
    marginTop: 4,
  },
  achievements: {
    width: "100%",
    backgroundColor: Colors.accentGlow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: 8,
  },
  achTitle: {
    fontFamily: "play-fair-bold",
    color: Colors.accent,
    fontSize: 15,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  achText: {
    fontFamily: "play-fair",
    color: Colors.text,
  },
});
