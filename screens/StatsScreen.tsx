import ScreenBackground from "@/components/ui/ScreenBackground";
import StatChip from "@/components/ui/StatChip";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { DIFFICULTIES } from "@/constants/gameConfig";
import { useGame } from "@/context/GameProvider";
import { formatElapsed } from "@/components/game/GameTimer";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StatsScreen({ onBack }: { onBack: () => void }) {
  const { stats } = useGame();
  const avgRounds =
    stats.gamesPlayed === 0
      ? "—"
      : (stats.totalRounds / stats.gamesPlayed).toFixed(1);
  const winRate =
    stats.gamesPlayed === 0
      ? "0%"
      : `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%`;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Title>Your Stats</Title>
          <Text style={styles.sub}>Lifetime across every mode and difficulty</Text>

          <View style={styles.grid}>
            <StatChip icon="game-controller" label="Games" value={stats.gamesPlayed} />
            <StatChip icon="trophy" label="Wins" value={stats.gamesWon} color={Colors.accent} />
            <StatChip icon="stats-chart" label="Win Rate" value={winRate} color={Colors.mint} />
            <StatChip icon="flame" label="Best Streak" value={stats.bestStreak} color={Colors.coral} />
            <StatChip icon="star" label="Best Score" value={stats.bestScore} color={Colors.accent} />
            <StatChip icon="layers" label="Avg Rounds" value={avgRounds} />
            <StatChip
              icon="flash"
              label="Fastest Win"
              value={
                stats.fastestWinMs == null
                  ? "—"
                  : formatElapsed(stats.fastestWinMs)
              }
              color={Colors.primary}
            />
            <StatChip
              icon="bulb"
              label="Best Rounds"
              value={stats.bestRounds ?? "—"}
            />
            <StatChip
              icon="calendar"
              label="Dailies Done"
              value={stats.dailyCompletions}
              color={Colors.mint}
            />
            <StatChip
              icon="cash"
              label="Total Score"
              value={stats.totalScore}
              color={Colors.accent}
            />
          </View>

          <Text style={styles.section}>Best scores by mode</Text>
          {DIFFICULTIES.map((d) => {
            const opp = stats.bestScores[`opponent-${d.id}`] ?? 0;
            const you = stats.bestScores[`player-${d.id}`] ?? 0;
            return (
              <View key={d.id} style={styles.row}>
                <Text style={[styles.diff, { color: d.color }]}>{d.label}</Text>
                <Text style={styles.score}>Oracle {opp}</Text>
                <Text style={styles.score}>You {you}</Text>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sub: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    textAlign: "center",
    marginVertical: 10,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  section: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 16,
    marginTop: 24,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  diff: {
    flex: 1,
    fontFamily: "play-fair-bold",
    fontSize: 15,
  },
  score: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    marginLeft: 12,
    fontSize: 13,
  },
});
