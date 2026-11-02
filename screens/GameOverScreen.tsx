import { formatElapsed } from "@/components/game/GameTimer";
import GameReplayModal from "@/components/replay/GameReplayModal";
import ShareResultModal from "@/components/share/ShareResultModal";
import ConfettiBurst from "@/components/ui/ConfettiBurst";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { ACHIEVEMENTS, MODE_METADATA, getDifficulty } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AnalyticsService } from "@/services/analytics/AnalyticsService";
import { HistoryService } from "@/services/history/HistoryService";
import type { GameResult } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
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
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const difficulty = getDifficulty(result.difficulty);
  const orbSize = Math.min(180, width * 0.45, height < 600 ? 120 : 160);

  // Compute mathematically verified post-game analysis
  const analysis = useMemo(
    () => AnalyticsService.analyzePostGame(result),
    [result],
  );

  // Create replayable history record
  const replayRecord = useMemo(
    () => HistoryService.createRecord(result),
    [result],
  );

  useEffect(() => {
    if (result.won) {
      buzz("success");
    }
  }, [result.won, buzz]);

  useEffect(() => {
    return () => clearNewlyUnlocked();
  }, [clearNewlyUnlocked]);

  const revealedNumber =
    result.secretNumber != null ? result.secretNumber : result.userNumber;
  const currentModeMeta = MODE_METADATA.find((m) => m.id === result.mode);
  const modeLabel =
    currentModeMeta?.title ?? (result.mode === "player" ? "You Hunt" : "Oracle");

  return (
    <ScreenBackground>
      <ConfettiBurst active={result.won} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Result Status Banner */}
          <View style={styles.statusPill}>
            <Ionicons
              name={result.won ? "trophy" : "alert-circle"}
              size={14}
              color={result.won ? Colors.accent : Colors.coral}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: result.won ? Colors.accent : Colors.coral },
              ]}
            >
              {result.won ? "MATCH COMPLETE" : "CHALLENGE ENDED"}
            </Text>
          </View>

          <Title size="xl">
            {result.won ? "Victory!" : "So Close!"}
          </Title>

          <Text style={styles.subtitle}>
            {result.won
              ? "The secret number has been solved."
              : "The Oracle keeps its mystery… for now."}
          </Text>

          {/* Centerpiece Revealed Number Orb */}
          <View
            style={[
              styles.orb,
              {
                width: orbSize,
                height: orbSize,
                borderRadius: orbSize / 2,
                borderColor: result.won ? Colors.accent : Colors.coral,
                shadowColor: result.won ? Colors.accent : Colors.coral,
              },
            ]}
          >
            <Text style={styles.orbLabel}>SECRET NUMBER</Text>
            <Text
              style={[
                styles.orbValue,
                {
                  fontSize: orbSize > 140 ? 54 : 36,
                  color: result.won ? Colors.accent : Colors.coral,
                },
              ]}
            >
              {revealedNumber}
            </Text>
          </View>

          {/* Score Card */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>TOTAL SCORE</Text>
            <Text style={styles.scoreValue}>{result.score}</Text>
          </View>

          {/* Performance Grid */}
          <View style={styles.grid}>
            <MetricCard
              icon="layers"
              label="Rounds"
              value={String(result.rounds)}
              color={Colors.primary}
            />
            <MetricCard
              icon="time"
              label="Time"
              value={formatElapsed(result.elapsedMs)}
              color={Colors.mint}
            />
            <MetricCard
              icon="game-controller"
              label="Mode"
              value={modeLabel}
              color={currentModeMeta?.color ?? Colors.accent}
            />
            <MetricCard
              icon="speedometer"
              label="Difficulty"
              value={difficulty.label}
              color={difficulty.color}
            />
          </View>

          {/* Post-Game Mathematical Analysis */}
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeaderRow}>
              <View style={styles.analysisTitleWrap}>
                <Ionicons name="analytics" size={16} color={Colors.accent} />
                <Text style={styles.analysisTitle}>PERFORMANCE ANALYSIS</Text>
              </View>
              <View style={styles.efficiencyBadge}>
                <Text style={styles.efficiencyBadgeText}>
                  {analysis.efficiencyScore}% Efficiency
                </Text>
              </View>
            </View>

            <Text style={styles.analysisStratLabel}>
              Deduction Style:{" "}
              <Text style={{ color: Colors.accent, fontWeight: "700" }}>
                {analysis.efficiencyLabel}
              </Text>
            </Text>

            {/* Efficiency Progress Track */}
            <View style={styles.effTrack}>
              <View
                style={[
                  styles.effFill,
                  { width: `${analysis.efficiencyScore}%` },
                ]}
              />
            </View>

            {/* Highlights */}
            {analysis.highlights.length > 0 && (
              <View style={styles.bulletSection}>
                <Text style={styles.bulletSectionTitle}>WHAT WENT WELL:</Text>
                {analysis.highlights.map((h, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={Colors.mint}
                    />
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actionable Suggestions */}
            {analysis.suggestions.length > 0 && (
              <View style={styles.bulletSection}>
                <Text style={styles.bulletSectionTitle}>TACTICAL SUGGESTIONS:</Text>
                {analysis.suggestions.map((s, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons
                      name="bulb-outline"
                      size={14}
                      color={Colors.accent}
                    />
                    <Text style={styles.bulletText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Newly Unlocked Badges Banner */}
          {newlyUnlocked.length > 0 && (
            <View style={styles.achievementsCard}>
              <View style={styles.achHeaderRow}>
                <Ionicons name="sparkles" size={18} color={Colors.accent} />
                <Text style={styles.achTitle}>New Badge Unlocked!</Text>
              </View>
              {newlyUnlocked.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <View key={id} style={styles.achRow}>
                    <View style={styles.achIconWrap}>
                      <Ionicons name="ribbon" size={16} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.achText}>{a.title}</Text>
                      <Text style={styles.achDesc}>{a.description}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Action CTAs */}
          <View style={styles.actionButtons}>
            <PrimaryButton
              variant="accent"
              size="lg"
              onPress={onReplay}
              icon={<Ionicons name="refresh" size={18} color={Colors.bg} />}
            >
              Play Again
            </PrimaryButton>

            {/* Replay Match & Share Results Row */}
            <View style={styles.secondaryActionRow}>
              <Pressable
                onPress={() => {
                  buzz("light");
                  setShowReplayModal(true);
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Replay this match"
              >
                <Ionicons name="play-circle" size={18} color={Colors.accent} />
                <Text style={styles.secondaryBtnText}>Replay Match</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  buzz("light");
                  setShowShareModal(true);
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Share your match result"
              >
                <Ionicons name="share-social" size={18} color={Colors.mint} />
                <Text style={[styles.secondaryBtnText, { color: Colors.mint }]}>
                  Share Result
                </Text>
              </Pressable>
            </View>

            <PrimaryButton
              variant="secondary"
              size="md"
              onPress={onHome}
              icon={<Ionicons name="home" size={18} color={Colors.text} />}
            >
              Main Menu
            </PrimaryButton>
          </View>
        </ScrollView>

        {/* Modals */}
        <GameReplayModal
          visible={showReplayModal}
          record={replayRecord}
          onClose={() => setShowReplayModal(false)}
        />

        <ShareResultModal
          visible={showShareModal}
          result={result}
          onClose={() => setShowShareModal(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    alignItems: "center",
    paddingBottom: 40,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  statusPillText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    fontSize: 14,
  },
  orb: {
    borderWidth: 2.5,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  orbLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1.5,
    fontSize: 10,
    textTransform: "uppercase",
  },
  orbValue: {
    fontFamily: FontFamily.display,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  scoreCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    marginBottom: 12,
  },
  scoreLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1.8,
    fontSize: 10,
  },
  scoreValue: {
    fontFamily: FontFamily.display,
    color: Colors.accent,
    fontSize: 42,
    lineHeight: 48,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    width: "100%",
    marginBottom: 14,
  },
  metric: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  metricLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  analysisCard: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 14,
  },
  analysisHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  analysisTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  analysisTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1,
  },
  efficiencyBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  efficiencyBadgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    fontWeight: "700",
  },
  analysisStratLabel: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  effTrack: {
    height: 6,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  effFill: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  bulletSection: {
    marginTop: 8,
    gap: 6,
  },
  bulletSectionTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bulletText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.text,
    flex: 1,
    lineHeight: 17,
  },
  achievementsCard: {
    width: "100%",
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    gap: 8,
  },
  achHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  achTitle: {
    fontFamily: FontFamily.display,
    color: Colors.accent,
    fontSize: 15,
  },
  achRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  achIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  achText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 13,
  },
  achDesc: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  actionButtons: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  secondaryActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  secondaryBtnText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
});
