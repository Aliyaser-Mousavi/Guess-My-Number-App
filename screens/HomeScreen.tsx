import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import StatChip from "@/components/ui/StatChip";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  onPlay: () => void;
  onDaily: () => void;
  onStats: () => void;
  onAchievements: () => void;
  onSettings: () => void;
  onHowTo: () => void;
  dailyDone: boolean;
};

export default function HomeScreen({
  onPlay,
  onDaily,
  onStats,
  onAchievements,
  onSettings,
  onHowTo,
  dailyDone,
}: Props) {
  const { stats } = useGame();
  const winRate =
    stats.gamesPlayed === 0
      ? 0
      : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable onPress={onSettings} style={styles.iconBtn}>
              <Ionicons name="settings-outline" size={22} color={Colors.text} />
            </Pressable>
            <Pressable onPress={onHowTo} style={styles.iconBtn}>
              <Ionicons
                name="help-circle-outline"
                size={22}
                color={Colors.text}
              />
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>NUMBER ORACLE</Text>
          <Title size="xl" style={styles.brand}>
            Guess My Number
          </Title>
          <Text style={styles.tagline}>
            Outsmart the oracle — or become one. Pick a mode, chase streaks,
            unlock achievements.
          </Text>

          <View style={styles.heroOrb}>
            <Text style={styles.heroNumber}>?</Text>
          </View>

          <PrimaryButton onPress={onPlay} variant="accent">
            Play Now
          </PrimaryButton>
          <PrimaryButton
            onPress={onDaily}
            variant={dailyDone ? "secondary" : "primary"}
            icon={
              <Ionicons
                name="calendar"
                size={18}
                color={dailyDone ? Colors.text : Colors.white}
              />
            }
          >
            {dailyDone ? "Daily Challenge ✓" : "Daily Challenge"}
          </PrimaryButton>

          <View style={styles.statsGrid}>
            <StatChip
              icon="flame"
              label="Streak"
              value={stats.currentStreak}
              color={Colors.coral}
            />
            <StatChip
              icon="trophy"
              label="Best Score"
              value={stats.bestScore}
              color={Colors.accent}
            />
            <StatChip
              icon="game-controller"
              label="Played"
              value={stats.gamesPlayed}
              color={Colors.primary}
            />
            <StatChip
              icon="stats-chart"
              label="Win Rate"
              value={`${winRate}%`}
              color={Colors.mint}
            />
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.navCard} onPress={onStats}>
              <Ionicons name="bar-chart" size={22} color={Colors.primary} />
              <Text style={styles.navLabel}>Stats</Text>
            </Pressable>
            <Pressable style={styles.navCard} onPress={onAchievements}>
              <Ionicons name="ribbon" size={22} color={Colors.accent} />
              <Text style={styles.navLabel}>Badges</Text>
              <Text style={styles.navMeta}>
                {stats.unlockedAchievements.length}/12
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontFamily: "play-fair",
    color: Colors.primary,
    letterSpacing: 3,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  brand: {
    marginTop: 6,
    color: Colors.text,
  },
  tagline: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 22,
    fontSize: 15,
    paddingHorizontal: 8,
  },
  heroOrb: {
    alignSelf: "center",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroNumber: {
    fontFamily: "play-fair-bold",
    fontSize: 56,
    color: Colors.accent,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  navCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 6,
  },
  navLabel: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 15,
    textAlign: "center",
  },
  navMeta: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
});
