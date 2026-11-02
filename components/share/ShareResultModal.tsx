import { formatElapsed } from "@/components/game/GameTimer";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";
import { getDifficulty, MODE_METADATA } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import type { GameResult } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  result: GameResult | null;
  onClose: () => void;
};

export default function ShareResultModal({ visible, result, onClose }: Props) {
  if (!result) return null;

  const diff = getDifficulty(result.difficulty);
  const modeMeta = MODE_METADATA.find((m) => m.id === result.mode);
  const modeTitle = modeMeta?.title ?? result.mode;
  const timeStr = formatElapsed(result.elapsedMs);

  const shareText = `🔮 Guess My Number — ${result.won ? "VICTORY!" : "Match Completed"}
🏆 Score: ${result.score.toLocaleString()} pts
🎮 Mode: ${modeTitle}
⚡ Difficulty: ${diff.label}
🎯 Attempts: ${result.rounds} rounds
⏱️ Time: ${timeStr}
💡 Hints: ${result.hintsUsed}

Can you beat my score?
#GuessMyNumber #MidnightArcade`;

  async function handleShare() {
    try {
      await Share.share({
        message: shareText,
        title: "Guess My Number Match Result",
      });
    } catch (err) {
      console.warn("Share error:", err);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalBox}>
            {/* Modal Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>SHARE YOUR RESULT</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Close share"
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>

            {/* Visual Shareable Card Preview */}
            <View style={styles.cardPreviewWrap}>
              <View style={styles.shareCard}>
                {/* Brand Top Bar */}
                <View style={styles.brandRow}>
                  <View style={styles.brandBadge}>
                    <Ionicons name="sparkles" size={12} color={Colors.accent} />
                    <Text style={styles.brandText}>GUESS MY NUMBER</Text>
                  </View>
                  <Text style={styles.arcadeTag}>MIDNIGHT ARCADE</Text>
                </View>

                {/* Outcome & Score */}
                <View style={styles.scoreHero}>
                  <Text
                    style={[
                      styles.outcomeTitle,
                      result.won ? styles.textWon : styles.textLost,
                    ]}
                  >
                    {result.won ? "VICTORY ACHIEVED!" : "CHALLENGE ENDED"}
                  </Text>
                  <Text style={styles.scoreNum}>
                    {result.score.toLocaleString()}
                  </Text>
                  <Text style={styles.scoreLabel}>POINTS</Text>
                </View>

                {/* Metrics Breakdown */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLbl}>MODE</Text>
                    <Text style={styles.metricVal} numberOfLines={1}>
                      {modeTitle}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLbl}>DIFFICULTY</Text>
                    <Text style={[styles.metricVal, { color: diff.color }]}>
                      {diff.label}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLbl}>ATTEMPTS</Text>
                    <Text style={styles.metricVal}>{result.rounds}</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLbl}>TIME</Text>
                    <Text style={styles.metricVal}>{timeStr}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.footerTagline}>Can you beat this score?</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <PrimaryButton
                variant="accent"
                size="md"
                onPress={handleShare}
                icon={<Ionicons name="share-social" size={18} color={Colors.bg} />}
              >
                Share Card
              </PrimaryButton>
              <PrimaryButton
                variant="secondary"
                size="md"
                onPress={onClose}
              >
                Done
              </PrimaryButton>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  safe: {
    width: "100%",
    maxWidth: 420,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: 15,
    color: Colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardPreviewWrap: {
    marginBottom: 20,
  },
  shareCard: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.accent,
    padding: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 8,
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1,
    fontWeight: "700",
  },
  arcadeTag: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.accent,
  },
  scoreHero: {
    alignItems: "center",
    marginVertical: 12,
  },
  outcomeTitle: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    marginBottom: 4,
  },
  textWon: {
    color: Colors.mint,
  },
  textLost: {
    color: Colors.coral,
  },
  scoreNum: {
    fontFamily: FontFamily.display,
    fontSize: 38,
    color: Colors.accent,
  },
  scoreLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: Radius.sm,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  metricItem: {
    width: "48%",
  },
  metricLbl: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
  },
  metricVal: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    color: Colors.text,
    fontWeight: "700",
    marginTop: 2,
  },
  cardFooter: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 8,
  },
  footerTagline: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  btnRow: {
    gap: 10,
  },
  pressed: {
    opacity: 0.6,
  },
});
