import RangeBar from "@/components/game/RangeBar";
import Card from "@/components/ui/Card";
import Colors from "@/constants/colors";
import { getDifficulty, MODE_METADATA } from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { HistoryService } from "@/services/history/HistoryService";
import type { GameHistoryRecord, GameReplayEvent } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  record: GameHistoryRecord | null;
  onClose: () => void;
};

export default function GameReplayModal({ visible, record, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reconstruct or fetch timeline
  const timeline: GameReplayEvent[] = useMemo(() => {
    if (!record) return [];
    if (record.timeline && record.timeline.length > 0) {
      return record.timeline;
    }
    return HistoryService.reconstructTimeline(record);
  }, [record]);

  const diff = record ? getDifficulty(record.difficulty) : null;
  const initialMin = record?.minRange ?? diff?.min ?? 1;
  const initialMax = record?.maxRange ?? diff?.max ?? 100;
  const targetNumber =
    record?.targetNumber ?? record?.secretNumber ?? record?.userNumber ?? 0;

  // Adjust state during render when a new record is presented
  const [prevRecordId, setPrevRecordId] = useState<string | null>(null);
  const currentRecordId = record?.id ?? null;
  if (currentRecordId !== prevRecordId) {
    setPrevRecordId(currentRecordId);
    setCurrentStep(0);
    setIsPlaying(false);
  }

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= timeline.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeline.length]);

  if (!record || !diff) return null;

  const modeMeta = MODE_METADATA.find((m) => m.id === record.mode);

  // Compute active range at currentStep
  let activeMin = initialMin;
  let activeMax = initialMax;

  for (let i = 0; i < currentStep; i++) {
    const ev = timeline[i];
    if (ev?.minAfter != null) activeMin = ev.minAfter;
    if (ev?.maxAfter != null) activeMax = ev.maxAfter;
  }

  const currentEvent = currentStep > 0 ? timeline[currentStep - 1] : null;
  const isFinalStep = currentStep === timeline.length;
  // NEVER reveal secret number until reaching the final conclusion step!
  const isNumberRevealed = isFinalStep;

  function stepBack() {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  function stepForward() {
    setIsPlaying(false);
    setCurrentStep((prev) => Math.min(timeline.length, prev + 1));
  }

  function togglePlay() {
    if (currentStep >= timeline.length) {
      setCurrentStep(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }

  function jumpStart() {
    setIsPlaying(false);
    setCurrentStep(0);
  }

  function jumpEnd() {
    setIsPlaying(false);
    setCurrentStep(timeline.length);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Close replay"
            >
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>MATCH REPLAY</Text>
              <Text style={styles.headerSub}>
                {modeMeta?.title ?? record.mode} · {diff.label}
              </Text>
            </View>

            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>
                {record.won ? "VICTORY" : "GAME OVER"}
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Centerpiece Orb: Shows '?' until Final Step */}
            <View style={styles.orbContainer}>
              <View
                style={[
                  styles.orb,
                  isNumberRevealed
                    ? record.won
                      ? styles.orbWon
                      : styles.orbLost
                    : styles.orbHidden,
                ]}
              >
                <Text style={styles.orbLabel}>
                  {isNumberRevealed ? "SECRET NUMBER" : "TARGET NUMBER"}
                </Text>
                <Text
                  style={[
                    styles.orbValue,
                    isNumberRevealed
                      ? record.won
                        ? styles.orbValueWon
                        : styles.orbValueLost
                      : styles.orbValueHidden,
                  ]}
                >
                  {isNumberRevealed ? targetNumber : "???"}
                </Text>
              </View>

              {!isNumberRevealed && (
                <Text style={styles.hiddenNotice}>
                  Protected until replay reaches conclusion
                </Text>
              )}
            </View>

            {/* Dynamic Range Bar */}
            <View style={styles.rangeSection}>
              <RangeBar
                min={initialMin}
                max={initialMax}
                low={activeMin}
                high={activeMax}
              />
            </View>

            {/* Current Step Guess Display */}
            {currentEvent ? (
              <Card variant="elevated" style={styles.activeGuessCard}>
                <View style={styles.activeGuessHeader}>
                  <Text style={styles.activeGuessStep}>
                    STEP {currentStep} OF {timeline.length}
                  </Text>
                  {currentEvent.type === "hint" ? (
                    <View style={styles.hintTag}>
                      <Ionicons name="bulb" size={12} color={Colors.accent} />
                      <Text style={styles.hintTagText}>HINT APPLIED</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.feedbackTag,
                        currentEvent.feedback === "correct"
                          ? styles.tagCorrect
                          : currentEvent.feedback === "high"
                          ? styles.tagHigh
                          : styles.tagLow,
                      ]}
                    >
                      <Text style={styles.feedbackTagText}>
                        {currentEvent.feedback === "correct"
                          ? "CORRECT NUMBER!"
                          : currentEvent.feedback === "high"
                          ? "TOO HIGH ▼"
                          : "TOO LOW ▲"}
                      </Text>
                    </View>
                  )}
                </View>

                {currentEvent.type === "guess" ? (
                  <View style={styles.guessValRow}>
                    <Text style={styles.guessValLabel}>SUBMITTED GUESS</Text>
                    <Text style={styles.guessValNum}>{currentEvent.guess}</Text>
                    <Text style={styles.rangeNarrowText}>
                      New Range: {activeMin} – {activeMax}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.hintValRow}>
                    <Text style={styles.hintDescText}>
                      {currentEvent.hintDescription}
                    </Text>
                  </View>
                )}
              </Card>
            ) : (
              <Card variant="default" style={styles.activeGuessCard}>
                <Text style={styles.pregameText}>
                  Press Play or Step Forward to start reviewing this session.
                </Text>
                <Text style={styles.pregameSub}>
                  Starting range: {initialMin} – {initialMax}
                </Text>
              </Card>
            )}

            {/* Event Timeline List */}
            <Text style={styles.timelineHeader}>TIMELINE OF EVENTS</Text>
            <View style={styles.timelineList}>
              {timeline.map((ev, i) => {
                const isPastOrCurrent = i < currentStep;
                const isCurrent = i === currentStep - 1;

                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setIsPlaying(false);
                      setCurrentStep(i + 1);
                    }}
                    style={[
                      styles.timelineRow,
                      isCurrent && styles.timelineRowCurrent,
                      !isPastOrCurrent && styles.timelineRowFuture,
                    ]}
                  >
                    <View style={styles.timelineStepBadge}>
                      <Text
                        style={[
                          styles.timelineStepText,
                          isCurrent && styles.timelineStepTextCurrent,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </View>

                    <View style={styles.timelineContent}>
                      {ev.type === "guess" ? (
                        <Text style={styles.timelineGuessText}>
                          Guess:{" "}
                          <Text style={styles.timelineGuessHighlight}>
                            {ev.guess}
                          </Text>
                        </Text>
                      ) : (
                        <Text style={styles.timelineHintText}>
                          Hint: {ev.hintDescription}
                        </Text>
                      )}
                    </View>

                    {ev.type === "guess" && (
                      <View
                        style={[
                          styles.miniFeedbackPill,
                          ev.feedback === "correct"
                            ? styles.pillCorrect
                            : ev.feedback === "high"
                            ? styles.pillHigh
                            : styles.pillLow,
                        ]}
                      >
                        <Text style={styles.miniFeedbackText}>
                          {ev.feedback === "correct"
                            ? "WIN"
                            : ev.feedback === "high"
                            ? "HIGH"
                            : "LOW"}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Playback Control Bar */}
          <View style={styles.controlBar}>
            <Pressable
              onPress={jumpStart}
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Jump to start"
            >
              <Ionicons name="play-skip-back" size={18} color={Colors.text} />
            </Pressable>

            <Pressable
              onPress={stepBack}
              disabled={currentStep === 0}
              style={({ pressed }) => [
                styles.ctrlBtn,
                currentStep === 0 && styles.ctrlDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Step back"
            >
              <Ionicons name="chevron-back" size={20} color={Colors.text} />
            </Pressable>

            <Pressable
              onPress={togglePlay}
              style={({ pressed }) => [
                styles.playBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause replay" : "Play replay"}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={22}
                color={Colors.bg}
              />
            </Pressable>

            <Pressable
              onPress={stepForward}
              disabled={currentStep === timeline.length}
              style={({ pressed }) => [
                styles.ctrlBtn,
                currentStep === timeline.length && styles.ctrlDisabled,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Step forward"
            >
              <Ionicons name="chevron-forward" size={20} color={Colors.text} />
            </Pressable>

            <Pressable
              onPress={jumpEnd}
              style={({ pressed }) => [styles.ctrlBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Jump to conclusion"
            >
              <Ionicons name="play-skip-forward" size={18} color={Colors.text} />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: 16,
    color: Colors.text,
  },
  headerSub: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  badgePillText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },
  orbContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  orb: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHidden: {
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  orbWon: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  orbLost: {
    borderColor: Colors.coral,
    backgroundColor: "rgba(255, 82, 82, 0.08)",
  },
  orbLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 2,
  },
  orbValue: {
    fontFamily: FontFamily.display,
    fontSize: 36,
  },
  orbValueHidden: {
    color: Colors.textMuted,
  },
  orbValueWon: {
    color: Colors.accent,
  },
  orbValueLost: {
    color: Colors.coral,
  },
  hiddenNotice: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 8,
  },
  rangeSection: {
    marginVertical: 12,
  },
  activeGuessCard: {
    padding: 16,
    marginBottom: 20,
  },
  activeGuessHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeGuessStep: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  feedbackTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  tagCorrect: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  tagHigh: {
    backgroundColor: "rgba(255, 82, 82, 0.2)",
  },
  tagLow: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  feedbackTagText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: "700",
    color: Colors.text,
  },
  hintTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  hintTagText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
  },
  guessValRow: {
    alignItems: "center",
    paddingVertical: 6,
  },
  guessValLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  guessValNum: {
    fontFamily: FontFamily.display,
    fontSize: 40,
    color: Colors.text,
    marginVertical: 4,
  },
  rangeNarrowText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.mint,
  },
  hintValRow: {
    paddingVertical: 8,
    alignItems: "center",
  },
  hintDescText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: Colors.accent,
    textAlign: "center",
  },
  pregameText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.text,
    textAlign: "center",
  },
  pregameSub: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  timelineHeader: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  timelineList: {
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  timelineRowCurrent: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  timelineRowFuture: {
    opacity: 0.4,
  },
  timelineStepBadge: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  timelineStepText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  timelineStepTextCurrent: {
    color: Colors.accent,
    fontWeight: "700",
  },
  timelineContent: {
    flex: 1,
  },
  timelineGuessText: {
    fontFamily: FontFamily.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  timelineGuessHighlight: {
    fontFamily: FontFamily.mono,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  timelineHintText: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 12,
    color: Colors.accent,
  },
  miniFeedbackPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  pillCorrect: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
  },
  pillHigh: {
    backgroundColor: "rgba(255, 82, 82, 0.2)",
  },
  pillLow: {
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  miniFeedbackText: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    fontWeight: "700",
    color: Colors.text,
  },
  controlBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  ctrlBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctrlDisabled: {
    opacity: 0.3,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
