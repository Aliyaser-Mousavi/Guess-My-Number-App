import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import SameText from "@/components/ui/SameText";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import {
  DIFFICULTIES,
  MODE_METADATA,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import type { CustomGameConfig, SetupConfig } from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type { CustomGameConfig, SetupConfig };

type Props = {
  onBack: () => void;
  onStart: (config: SetupConfig) => void;
  forcedDaily?: boolean;
};

export default function StartGameScreen({
  onBack,
  onStart,
  forcedDaily = false,
}: Props) {
  const { buzz, playSound, recommendation } = useGame();
  const { showAlert } = useAppAlert();
  const { isGuest } = useAuth();

  const [mode, setMode] = useState<GameMode>("opponent");
  const [difficultyId, setDifficultyId] = useState<DifficultyId>("medium");
  const [enteredNumber, setEnteredNumber] = useState("");
  const [dismissedRecommendation, setDismissedRecommendation] = useState(false);
  const [isRanked, setIsRanked] = useState(false);

  // Time Attack duration option: 30s, 60s, 90s
  const [timeLimit, setTimeLimit] = useState(60);

  // Pass and Play names
  const [p1Name, setP1Name] = useState("Player 1");
  const [p2Name, setP2Name] = useState("Player 2");

  // Custom game options
  const [customMin, setCustomMin] = useState("1");
  const [customMax, setCustomMax] = useState("200");
  const [customLives, setCustomLives] = useState<number | null>(8);
  const [customTimer, setCustomTimer] = useState<number | null>(null);
  const [customHints, setCustomHints] = useState(2);
  const [customSubMode, setCustomSubMode] = useState<"player" | "opponent">("player");

  const difficulty =
    DIFFICULTIES.find((d) => d.id === difficultyId) ?? DIFFICULTIES[1];
  const activeModeMeta =
    MODE_METADATA.find((m) => m.id === mode) ?? MODE_METADATA[0];

  function handleStartGame() {
    buzz("success");

    if (mode === "opponent") {
      const chosen = parseInt(enteredNumber, 10);
      if (
        isNaN(chosen) ||
        chosen < difficulty.min ||
        chosen > difficulty.max
      ) {
        buzz("error");
        showAlert(
          "Invalid Secret Number",
          `Pick a whole number between ${difficulty.min} and ${difficulty.max}.`,
        );
        return;
      }
      onStart({
        mode: "opponent",
        difficultyId,
        userNumber: chosen,
        isDaily: forcedDaily,
      });
      return;
    }

    if (mode === "player") {
      onStart({
        mode: "player",
        difficultyId,
        isDaily: forcedDaily,
        isRanked: forcedDaily ? false : isRanked,
      });
      return;
    }

    if (mode === "timeAttack") {
      onStart({
        mode: "timeAttack",
        difficultyId,
        timeLimitSeconds: timeLimit,
        isDaily: false,
      });
      return;
    }

    if (mode === "survival") {
      onStart({
        mode: "survival",
        difficultyId: "easy",
        isDaily: false,
      });
      return;
    }

    if (mode === "blitz") {
      onStart({
        mode: "blitz",
        difficultyId: "easy",
        isDaily: false,
      });
      return;
    }

    if (mode === "passAndPlay") {
      onStart({
        mode: "passAndPlay",
        difficultyId: "medium",
        player1Name: p1Name.trim() || "Player 1",
        player2Name: p2Name.trim() || "Player 2",
        isDaily: false,
      });
      return;
    }

    if (mode === "logicPuzzle") {
      onStart({
        mode: "logicPuzzle",
        difficultyId,
        isDaily: false,
      });
      return;
    }

    if (mode === "custom") {
      const minVal = parseInt(customMin, 10);
      const maxVal = parseInt(customMax, 10);

      if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
        buzz("error");
        showAlert(
          "Invalid Custom Bounds",
          "Minimum number must be strictly less than Maximum number.",
        );
        return;
      }

      const customConfig: CustomGameConfig = {
        min: minVal,
        max: maxVal,
        lives: customLives,
        timerSeconds: customTimer,
        hints: customHints,
        subMode: customSubMode,
      };

      onStart({
        mode: "custom",
        difficultyId: "medium",
        customConfig,
        isDaily: false,
      });
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Top Navigation */}
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => {
                  buzz("light");
                  onBack();
                }}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={({ pressed }) => [
                  styles.backBtn,
                  pressed && styles.backBtnPressed,
                ]}
              >
                <Ionicons name="arrow-back" size={20} color={Colors.text} />
              </Pressable>
              <View style={styles.titleWrap}>
                <Title size="lg">
                  {forcedDaily ? "Daily Challenge" : "Game Setup"}
                </Title>
              </View>
              <View style={{ width: 42 }} />
            </View>

            <SameText muted style={styles.subtitle}>
              {forcedDaily
                ? "One shared secret number for everyone today."
                : "Choose a game mode and configure your match."}
            </SameText>

            {forcedDaily ? (
              <Card variant="accent" style={styles.dailyCard}>
                <View style={styles.dailyBadgeRow}>
                  <Ionicons name="calendar" size={20} color={Colors.accent} />
                  <Text style={styles.dailyBadgeText}>TODAY&apos;S MISSION</Text>
                </View>
                <Text style={styles.dailyInfo}>
                  Medium range (1–100). Guess the hidden number before your 7 lives run out. You have 2 hints available.
                </Text>
                <PrimaryButton
                  variant="accent"
                  size="lg"
                  onPress={() => {
                    buzz("success");
                    onStart({
                      mode: "player",
                      difficultyId: "medium",
                      isDaily: true,
                    });
                  }}
                  icon={<Ionicons name="play" size={18} color={Colors.bg} />}
                  style={{ marginTop: 18 }}
                >
                  Start Daily Hunt
                </PrimaryButton>
              </Card>
            ) : (
              <>
                {/* Mode Selector Strip */}
                <Text style={styles.sectionHeader}>SELECT GAME MODE</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modesScroll}
                >
                  {MODE_METADATA.map((m) => {
                    const isSelected = mode === m.id;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => {
                          buzz("light");
                          setMode(m.id);
                        }}
                        style={[
                          styles.modeTab,
                          isSelected && {
                            borderColor: m.color,
                            backgroundColor: m.color + "18",
                          },
                        ]}
                      >
                        <Ionicons
                          name={m.icon as keyof typeof Ionicons.glyphMap}
                          size={18}
                          color={isSelected ? m.color : Colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.modeTabText,
                            isSelected && { color: Colors.text, fontFamily: FontFamily.bodyBold },
                          ]}
                        >
                          {m.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Active Mode Briefing & Rules Card */}
                <Card variant="elevated" style={styles.briefingCard}>
                  <View style={styles.briefingTop}>
                    <View
                      style={[
                        styles.modeIconWrap,
                        { backgroundColor: activeModeMeta.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={activeModeMeta.icon as keyof typeof Ionicons.glyphMap}
                        size={22}
                        color={activeModeMeta.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.titleBadgeRow}>
                        <Text style={styles.briefingTitle}>
                          {activeModeMeta.title}
                        </Text>
                        <View
                          style={[
                            styles.modeBadge,
                            { backgroundColor: activeModeMeta.color + "25" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modeBadgeText,
                              { color: activeModeMeta.color },
                            ]}
                          >
                            {activeModeMeta.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.briefingDesc}>
                        {activeModeMeta.shortDesc}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rulesList}>
                    {activeModeMeta.rules.map((rule, idx) => (
                      <View key={idx} style={styles.ruleItem}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={activeModeMeta.color}
                        />
                        <Text style={styles.ruleText}>{rule}</Text>
                      </View>
                    ))}
                  </View>
                </Card>

                {/* Mode-Specific Configuration Areas */}

                {/* 1. Difficulty Grid (for modes that use difficulty) */}
                {(mode === "opponent" ||
                  mode === "player" ||
                  mode === "timeAttack" ||
                  mode === "logicPuzzle") && (
                  <>
                    {/* Adaptive Difficulty Recommendation Card */}
                    {recommendation && !dismissedRecommendation && (
                      <Card variant="accent" style={styles.recCard}>
                        <View style={styles.recHeaderRow}>
                          <View style={styles.recBadge}>
                            <Ionicons name="sparkles" size={13} color={Colors.accent} />
                            <Text style={styles.recBadgeText}>{recommendation.badge}</Text>
                          </View>
                          <Pressable
                            onPress={() => {
                              buzz("light");
                              setDismissedRecommendation(true);
                            }}
                            style={styles.recDismissBtn}
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss recommendation"
                          >
                            <Ionicons name="close" size={16} color={Colors.textDim} />
                          </Pressable>
                        </View>
                        <Text style={styles.recReason}>{recommendation.reason}</Text>
                        <Pressable
                          onPress={() => {
                            buzz("success");
                            playSound("button_click");
                            setDifficultyId(recommendation.recommendedDifficulty);
                            setDismissedRecommendation(true);
                          }}
                          style={styles.recApplyBtn}
                        >
                          <Text style={styles.recApplyText}>
                            Switch to {recommendation.recommendedDifficulty.toUpperCase()}
                          </Text>
                          <Ionicons name="arrow-forward" size={13} color={Colors.bg} />
                        </Pressable>
                      </Card>
                    )}

                    <Text style={styles.sectionHeader}>DIFFICULTY TIER</Text>
                    <View style={styles.diffGrid}>
                      {DIFFICULTIES.map((d) => {
                        const isSelected = difficultyId === d.id;
                        return (
                          <Pressable
                            key={d.id}
                            onPress={() => {
                              buzz("light");
                              setDifficultyId(d.id);
                              setEnteredNumber("");
                            }}
                            style={[
                              styles.diffCard,
                              isSelected && {
                                borderColor: d.color,
                                backgroundColor: d.color + "1A",
                              },
                            ]}
                          >
                            <View style={styles.diffHeader}>
                              <Text style={[styles.diffTitle, { color: d.color }]}>
                                {d.label}
                              </Text>
                              {isSelected && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={16}
                                  color={d.color}
                                />
                              )}
                            </View>
                            <Text style={styles.diffRange}>
                              {d.min} – {d.max}
                            </Text>
                            <Text style={styles.diffMeta}>
                              {d.hints === 0 ? "No hints" : `${d.hints} hint${d.hints > 1 ? "s" : ""}`} • {d.multiplier}x
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                )}

                {/* 1B. Ranked Mode Toggle (Group 07C) */}
                {mode === "player" && !forcedDaily && (
                  <Pressable
                    onPress={() => {
                      if (isGuest) {
                        showAlert(
                          "Authentication Required",
                          "Ranked matches require signing in with an account so your Competitive Rating (CR / MMR) is verified on the server.",
                        );
                        return;
                      }
                      buzz("medium");
                      playSound("button_click");
                      setIsRanked((r) => !r);
                    }}
                    style={[
                      styles.rankedToggleCard,
                      isRanked && styles.rankedToggleCardActive,
                    ]}
                  >
                    <View style={styles.rankedToggleLeft}>
                      <View
                        style={[
                          styles.rankedIconWrap,
                          isRanked && { backgroundColor: "rgba(245, 158, 11, 0.2)" },
                        ]}
                      >
                        <Ionicons
                          name={isRanked ? "shield-checkmark" : "shield-outline"}
                          size={22}
                          color={isRanked ? Colors.accent : Colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.rankedBadgeRow}>
                          <Text style={[styles.rankedTitle, isRanked && { color: Colors.accent }]}>
                            COMPETITIVE RANKED
                          </Text>
                          {isRanked && (
                            <View style={styles.rankedPill}>
                              <Text style={styles.rankedPillText}>SERVER VERIFIED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.rankedDesc}>
                          {isRanked
                            ? "Server-authoritative game. Secret generated on server. Results update your official Competitive Rating (CR)."
                            : "Casual match. Tap to enable Ranked mode with server verification & MMR."}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.toggleSwitch,
                        isRanked && styles.toggleSwitchActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleKnob,
                          isRanked && styles.toggleKnobActive,
                        ]}
                      />
                    </View>
                  </Pressable>
                )}

                {/* 2. Oracle Mode Number Input */}
                {mode === "opponent" && (
                  <Card variant="elevated" style={styles.inputCard}>
                    <Text style={styles.cardHeader}>YOUR SECRET NUMBER</Text>
                    <Text style={styles.cardSub}>
                      Pick any number between {difficulty.min} and {difficulty.max}
                    </Text>
                    <TextInput
                      style={styles.numberInput}
                      maxLength={String(difficulty.max).length}
                      keyboardType="number-pad"
                      value={enteredNumber}
                      onChangeText={setEnteredNumber}
                      selectionColor={Colors.accent}
                      placeholder="—"
                      placeholderTextColor={Colors.textDim}
                    />
                  </Card>
                )}

                {/* 3. Time Attack Duration Selector */}
                {mode === "timeAttack" && (
                  <Card variant="elevated" style={styles.configCard}>
                    <Text style={styles.cardHeader}>COUNTDOWN DURATION</Text>
                    <View style={styles.pillsRow}>
                      {[30, 60, 90].map((dur) => (
                        <Pressable
                          key={dur}
                          onPress={() => {
                            buzz("light");
                            setTimeLimit(dur);
                          }}
                          style={[
                            styles.pillBtn,
                            timeLimit === dur && styles.pillBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              timeLimit === dur && styles.pillBtnTextActive,
                            ]}
                          >
                            {dur} Seconds
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                )}

                {/* 4. Pass and Play Player Names */}
                {mode === "passAndPlay" && (
                  <Card variant="elevated" style={styles.configCard}>
                    <Text style={styles.cardHeader}>PLAYER NAMES</Text>
                    <View style={styles.nameRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Player 1</Text>
                        <TextInput
                          style={styles.textInput}
                          value={p1Name}
                          onChangeText={setP1Name}
                          maxLength={12}
                          selectionColor={Colors.accent}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Player 2</Text>
                        <TextInput
                          style={styles.textInput}
                          value={p2Name}
                          onChangeText={setP2Name}
                          maxLength={12}
                          selectionColor={Colors.primary}
                        />
                      </View>
                    </View>
                  </Card>
                )}

                {/* 5. Custom Game Controls */}
                {mode === "custom" && (
                  <Card variant="elevated" style={styles.configCard}>
                    <Text style={styles.cardHeader}>CUSTOM PARAMETERS</Text>

                    {/* Bounds */}
                    <View style={styles.nameRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Minimum</Text>
                        <TextInput
                          style={styles.textInput}
                          value={customMin}
                          onChangeText={setCustomMin}
                          keyboardType="number-pad"
                          maxLength={4}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Maximum</Text>
                        <TextInput
                          style={styles.textInput}
                          value={customMax}
                          onChangeText={setCustomMax}
                          keyboardType="number-pad"
                          maxLength={5}
                        />
                      </View>
                    </View>

                    {/* Submode toggle */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Who Hunts?
                    </Text>
                    <View style={styles.pillsRow}>
                      <Pressable
                        onPress={() => setCustomSubMode("player")}
                        style={[
                          styles.pillBtn,
                          customSubMode === "player" && styles.pillBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            customSubMode === "player" && styles.pillBtnTextActive,
                          ]}
                        >
                          You Hunt
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setCustomSubMode("opponent")}
                        style={[
                          styles.pillBtn,
                          customSubMode === "opponent" && styles.pillBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillBtnText,
                            customSubMode === "opponent" && styles.pillBtnTextActive,
                          ]}
                        >
                          Oracle Hunts
                        </Text>
                      </Pressable>
                    </View>

                    {/* Allowed Lives */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Allowed Lives
                    </Text>
                    <View style={styles.pillsRow}>
                      {[5, 8, 12, null].map((l, i) => (
                        <Pressable
                          key={i}
                          onPress={() => setCustomLives(l)}
                          style={[
                            styles.pillBtn,
                            customLives === l && styles.pillBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              customLives === l && styles.pillBtnTextActive,
                            ]}
                          >
                            {l === null ? "Infinite" : `${l}`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Timer options */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Timer Limit
                    </Text>
                    <View style={styles.pillsRow}>
                      {[null, 30, 60, 120].map((t, i) => (
                        <Pressable
                          key={i}
                          onPress={() => setCustomTimer(t)}
                          style={[
                            styles.pillBtn,
                            customTimer === t && styles.pillBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              customTimer === t && styles.pillBtnTextActive,
                            ]}
                          >
                            {t === null ? "None" : `${t}s`}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Hints */}
                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Available Hints
                    </Text>
                    <View style={styles.pillsRow}>
                      {[0, 1, 2, 3, 5].map((h) => (
                        <Pressable
                          key={h}
                          onPress={() => setCustomHints(h)}
                          style={[
                            styles.pillBtn,
                            customHints === h && styles.pillBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.pillBtnText,
                              customHints === h && styles.pillBtnTextActive,
                            ]}
                          >
                            {h}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </Card>
                )}

                {/* Primary Start Action Button */}
                <PrimaryButton
                  variant="accent"
                  size="lg"
                  onPress={handleStartGame}
                  icon={<Ionicons name="play" size={18} color={Colors.bg} />}
                  style={{ marginTop: 16 }}
                >
                  Start {activeModeMeta.title}
                </PrimaryButton>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backBtnPressed: {
    backgroundColor: Colors.surfaceSoft,
    borderColor: Colors.borderStrong,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
  },
  sectionHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 6,
    paddingLeft: 2,
  },
  modesScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 10,
  },
  modeTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  modeTabText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    fontSize: 13,
  },
  briefingCard: {
    padding: 16,
    marginBottom: 12,
  },
  briefingTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  briefingTitle: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 16,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  modeBadgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  briefingDesc: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  rulesList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleText: {
    fontFamily: FontFamily.body,
    color: Colors.text,
    fontSize: 12,
    flex: 1,
  },
  recCard: {
    padding: 12,
    marginBottom: 12,
  },
  recHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.xs,
  },
  recBadgeText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  recDismissBtn: {
    padding: 4,
  },
  recReason: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },
  recApplyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  recApplyText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.bg,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  diffGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  diffCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  diffHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  diffTitle: {
    fontFamily: FontFamily.display,
    fontSize: 14,
  },
  diffRange: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 13,
  },
  diffMeta: {
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    fontSize: 11,
    marginTop: 2,
  },
  dailyCard: {
    marginTop: 10,
    padding: 20,
  },
  dailyBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dailyBadgeText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  dailyInfo: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  inputCard: {
    marginTop: 6,
    alignItems: "center",
    padding: 18,
  },
  configCard: {
    marginTop: 6,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  cardSub: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 10,
  },
  numberInput: {
    alignSelf: "center",
    height: 64,
    minWidth: 130,
    fontSize: 40,
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    color: Colors.accent,
    marginVertical: 8,
    fontFamily: FontFamily.display,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillBtnActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  pillBtnText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    fontSize: 12,
  },
  pillBtnTextActive: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputLabel: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: Colors.text,
    fontFamily: FontFamily.body,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rankedToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: Radius.md,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  rankedToggleCardActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  rankedToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rankedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rankedTitle: {
    fontFamily: FontFamily.mono,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.5,
  },
  rankedPill: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  rankedPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 8,
    fontWeight: "700",
    color: Colors.accent,
  },
  rankedDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 2,
    justifyContent: "center",
  },
  toggleSwitchActive: {
    backgroundColor: Colors.accent,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFF",
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
});
