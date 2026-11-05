// ==============================================================================
// Screen: NumberAcademyScreen.tsx
// Description: Interactive Educational & Brain Training System (Group 09).
//              Curriculum lessons with real-time visual range visualizer,
//              practice lab challenges, daily brain drills, and mastery ranking.
// ==============================================================================

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import {
  ACADEMY_MODULES,
  AcademyService,
  PRACTICE_CHALLENGES,
} from "@/services/academy/AcademyService";
import type {
  AcademyLesson,
  AcademyProgressState,
  DailyBrainPuzzle,
  GuessEvaluation,
  PracticeChallenge,
} from "@/types/academy";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AcademyTab = "curriculum" | "practice" | "daily" | "mastery";

type Props = {
  onBack: () => void;
};

export default function NumberAcademyScreen({ onBack }: Props) {
  const { buzz, playSound, awardProgressionXp } = useGame();

  const [tab, setTab] = useState<AcademyTab>("curriculum");
  const [progress, setProgress] = useState<AcademyProgressState | null>(null);

  // Interactive Sandbox Modal State
  const [activeLesson, setActiveLesson] = useState<AcademyLesson | null>(null);
  const [activeChallenge, setActiveChallenge] =
    useState<PracticeChallenge | null>(null);
  const [activeDaily, setActiveDaily] = useState<DailyBrainPuzzle | null>(null);

  // In-Sandbox Gameplay State
  const [sandboxLow, setSandboxLow] = useState(1);
  const [sandboxHigh, setSandboxHigh] = useState(100);
  const [sandboxSecret, setSandboxSecret] = useState(50);
  const [sandboxMaxGuesses, setSandboxMaxGuesses] = useState(7);
  const [sandboxGuesses, setSandboxGuesses] = useState<number[]>([]);
  const [evaluations, setEvaluations] = useState<GuessEvaluation[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [solved, setSolved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearSandboxTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Load progress safely on mount
  useEffect(() => {
    let ignore = false;
    AcademyService.loadProgress().then((data) => {
      if (!ignore) {
        setProgress(data);
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const todayDaily = React.useMemo(() => {
    return AcademyService.getDailyBrainPuzzle();
  }, []);

  const masteryRank = React.useMemo(() => {
    return AcademyService.getMasteryRank(progress?.learningScore || 0);
  }, [progress?.learningScore]);

  // Timed Challenge Countdown Enforcement
  const isTimerActive = timeRemaining !== null && timeRemaining > 0;
  useEffect(() => {
    if (!isTimerActive) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearSandboxTimer();
          setFailed(true);
          buzz("error");
          playSound("defeat");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearSandboxTimer();
    };
  }, [isTimerActive, clearSandboxTimer, buzz, playSound]);

  const strategyAccuracy = React.useMemo(() => {
    if (!progress || progress.totalGuessesEvaluated === 0) return 100;
    return Math.round(
      (progress.optimalGuessesCount / progress.totalGuessesEvaluated) * 100,
    );
  }, [progress]);

  // Start an interactive lesson sandbox
  const handleStartLesson = (lesson: AcademyLesson) => {
    buzz("light");
    playSound("button_click");
    clearSandboxTimer();
    setTimeRemaining(null);
    setActiveLesson(lesson);
    setActiveChallenge(null);
    setActiveDaily(null);
    setSandboxLow(lesson.sandbox.targetRange.min);
    setSandboxHigh(lesson.sandbox.targetRange.max);
    setSandboxSecret(lesson.sandbox.secretNumber);
    setSandboxMaxGuesses(lesson.sandbox.maxGuesses || 7);
    setSandboxGuesses([]);
    setEvaluations([]);
    setInputVal("");
    setSolved(false);
    setFailed(false);
  };

  // Start a practice challenge
  const handleStartChallenge = useCallback(
    (challenge: PracticeChallenge) => {
      buzz("light");
      playSound("button_click");
      clearSandboxTimer();
      setActiveChallenge(challenge);
      setActiveLesson(null);
      setActiveDaily(null);
      setSandboxLow(challenge.range.min);
      setSandboxHigh(challenge.range.max);
      const target = AcademyService.generateChallengeTarget(
        challenge.range.min,
        challenge.range.max,
        challenge.constraints,
      );
      setSandboxSecret(target);
      setSandboxMaxGuesses(challenge.maxAttempts);
      setSandboxGuesses([]);
      setEvaluations([]);
      setInputVal("");
      setSolved(false);
      setFailed(false);
      setTimeRemaining(challenge.timeLimitSeconds ?? null);
    },
    [buzz, playSound, clearSandboxTimer],
  );

  // Start today's Daily Brain Training
  const handleStartDaily = (daily: DailyBrainPuzzle) => {
    buzz("light");
    playSound("button_click");
    clearSandboxTimer();
    setTimeRemaining(null);
    setActiveDaily(daily);
    setActiveLesson(null);
    setActiveChallenge(null);
    setSandboxLow(daily.range.min);
    setSandboxHigh(daily.range.max);
    setSandboxSecret(daily.secretNumber);
    setSandboxMaxGuesses(daily.maxAttempts);
    setSandboxGuesses([]);
    setEvaluations([]);
    setInputVal("");
    setSolved(false);
    setFailed(false);
  };

  // Submit a guess in interactive sandbox
  const handleSubmitSandboxGuess = () => {
    const num = parseInt(inputVal, 10);
    if (isNaN(num)) return;

    buzz("light");
    playSound("guess_submit");

    const activeConstraints =
      activeChallenge?.constraints ||
      activeLesson?.sandbox.clues ||
      activeDaily?.constraints;

    const evaluation = AcademyService.evaluateGuess(
      num,
      sandboxLow,
      sandboxHigh,
      activeConstraints,
    );
    const nextEvaluations = [...evaluations, evaluation];
    const nextGuesses = [...sandboxGuesses, num];

    setEvaluations(nextEvaluations);
    setSandboxGuesses(nextGuesses);
    setInputVal("");

    if (num === sandboxSecret) {
      clearSandboxTimer();
      setSolved(true);
      buzz("success");
      playSound("victory");

      // Save exercise results
      AcademyService.recordExerciseResults({
        evaluations: nextEvaluations,
        lessonId: activeLesson?.id,
        challengeId: activeChallenge?.id,
        dailyDateStr: activeDaily?.dateStr,
        starsAwarded: 3,
        score: Math.max(100, 1000 - nextGuesses.length * 100),
      }).then(({ updatedState, xpEarned }) => {
        setProgress(updatedState);
        if (xpEarned > 0) {
          awardProgressionXp(xpEarned);
          Alert.alert(
            "Strategy Mastered!",
            `You earned +${xpEarned} XP for completing this exercise!`,
          );
        }
      });
      return;
    }

    // Shrink bounds
    if (num < sandboxSecret) {
      setSandboxLow((prev) => Math.max(prev, num + 1));
      playSound("guess_wrong");
    } else {
      setSandboxHigh((prev) => Math.min(prev, num - 1));
      playSound("guess_wrong");
    }

    if (nextGuesses.length >= sandboxMaxGuesses) {
      clearSandboxTimer();
      setFailed(true);
      buzz("error");
      playSound("defeat");
    }
  };

  const handleCloseSandbox = () => {
    buzz("light");
    clearSandboxTimer();
    setActiveLesson(null);
    setActiveChallenge(null);
    setActiveDaily(null);
    setTimeRemaining(null);
  };

  const isModalOpen = Boolean(activeLesson || activeChallenge || activeDaily);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Title style={styles.title}>NUMBER ACADEMY</Title>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, tab === "curriculum" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("curriculum");
            }}
          >
            <Ionicons
              name="book"
              size={14}
              color={tab === "curriculum" ? Colors.primary : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "curriculum" && styles.tabBtnTextActive,
              ]}
            >
              Lessons
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, tab === "practice" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("practice");
            }}
          >
            <Ionicons
              name="flask"
              size={14}
              color={tab === "practice" ? Colors.accent : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "practice" && styles.tabBtnTextActive,
              ]}
            >
              Practice Lab
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, tab === "daily" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("daily");
            }}
          >
            <Ionicons
              name="calendar"
              size={14}
              color={tab === "daily" ? Colors.coral : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "daily" && styles.tabBtnTextActive,
              ]}
            >
              Daily Brain
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, tab === "mastery" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("mastery");
            }}
          >
            <Ionicons
              name="ribbon"
              size={14}
              color={tab === "mastery" ? "#A855F7" : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "mastery" && styles.tabBtnTextActive,
              ]}
            >
              Mastery
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: CURRICULUM LESSONS */}
          {tab === "curriculum" && (
            <View>
              {ACADEMY_MODULES.map((module) => (
                <View key={module.id} style={styles.moduleSection}>
                  <View style={styles.moduleHeader}>
                    <Ionicons
                      name={module.icon as any}
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                  </View>
                  <Text style={styles.moduleDesc}>{module.description}</Text>

                  <View style={styles.lessonsGrid}>
                    {module.lessons.map((lesson) => {
                      const isCompleted = progress?.completedLessons.includes(
                        lesson.id,
                      );
                      return (
                        <Card key={lesson.id} style={styles.lessonCard}>
                          <View style={styles.lessonTopRow}>
                            <View style={styles.lessonTierBadge}>
                              <Text style={styles.lessonTierText}>
                                {lesson.tier.toUpperCase()}
                              </Text>
                            </View>
                            {isCompleted && (
                              <View style={styles.completedBadge}>
                                <Ionicons
                                  name="checkmark-circle"
                                  size={16}
                                  color={Colors.mint}
                                />
                                <Text style={styles.completedBadgeText}>
                                  COMPLETED
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonSubtitle}>
                            {lesson.subtitle}
                          </Text>
                          <Text style={styles.lessonSummary}>
                            {lesson.summary}
                          </Text>

                          {lesson.formulaDisplay && (
                            <View style={styles.formulaBox}>
                              <Text style={styles.formulaText}>
                                {lesson.formulaDisplay}
                              </Text>
                            </View>
                          )}

                          <PrimaryButton
                            onPress={() => handleStartLesson(lesson)}
                            variant={isCompleted ? "secondary" : "primary"}
                            style={styles.lessonBtn}
                          >
                            {isCompleted
                              ? "PRACTICE SANDBOX"
                              : "START INTERACTIVE LESSON"}
                          </PrimaryButton>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 2: PRACTICE LAB */}
          {tab === "practice" && (
            <View style={styles.practiceContainer}>
              <Text style={styles.sectionHeader}>
                TARGETED STRATEGY CHALLENGES
              </Text>
              {PRACTICE_CHALLENGES.map((challenge) => {
                const isDone = progress?.completedChallenges.includes(
                  challenge.id,
                );
                return (
                  <Card key={challenge.id} style={styles.practiceCard}>
                    <View style={styles.practiceTopRow}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {challenge.category.replace("_", " ").toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.xpBadge}>
                        +{challenge.rewardXp} XP
                      </Text>
                    </View>

                    <Text style={styles.practiceTitle}>{challenge.title}</Text>
                    <Text style={styles.practiceDesc}>
                      {challenge.description}
                    </Text>

                    <View style={styles.practiceSpecs}>
                      <Text style={styles.specItem}>
                        Range: {challenge.range.min}–{challenge.range.max}
                      </Text>
                      <Text style={styles.specItem}>
                        Max Attempts: {challenge.maxAttempts}
                      </Text>
                      {challenge.timeLimitSeconds && (
                        <Text style={styles.specItem}>
                          Time: {challenge.timeLimitSeconds}s
                        </Text>
                      )}
                    </View>

                    <PrimaryButton
                      onPress={() => handleStartChallenge(challenge)}
                      variant={isDone ? "secondary" : "accent"}
                      style={styles.practiceBtn}
                    >
                      {isDone ? "RETRY DRILL" : "LAUNCH CHALLENGE"}
                    </PrimaryButton>
                  </Card>
                );
              })}
            </View>
          )}

          {/* TAB 3: DAILY BRAIN TRAINING */}
          {tab === "daily" && (
            <Card style={styles.dailyCard}>
              <View style={styles.dailyHeaderBadge}>
                <Ionicons name="sparkles" size={16} color={Colors.accent} />
                <Text style={styles.dailyHeaderBadgeText}>
                  TODAY&apos;S VERIFIABLE PROTOCOL
                </Text>
              </View>

              <Text style={styles.dailyTitle}>{todayDaily.title}</Text>
              <Text style={styles.dailyDesc}>{todayDaily.description}</Text>

              <View style={styles.dailySpecsGrid}>
                <View style={styles.dailySpecBox}>
                  <Text style={styles.dailySpecLabel}>RANGE</Text>
                  <Text style={styles.dailySpecVal}>
                    {todayDaily.range.min}–{todayDaily.range.max}
                  </Text>
                </View>
                <View style={styles.dailySpecBox}>
                  <Text style={styles.dailySpecLabel}>THEORETICAL</Text>
                  <Text style={styles.dailySpecVal}>
                    {todayDaily.theoreticalMinAttempts} GUESSES
                  </Text>
                </View>
                <View style={styles.dailySpecBox}>
                  <Text style={styles.dailySpecLabel}>MAX ALLOWED</Text>
                  <Text style={styles.dailySpecVal}>
                    {todayDaily.maxAttempts}
                  </Text>
                </View>
              </View>

              {todayDaily.constraints && (
                <View style={styles.constraintsCard}>
                  <Text style={styles.constraintsLabel}>
                    ACTIVE MATHEMATICAL CLUE:
                  </Text>
                  {todayDaily.constraints.map((c, i) => (
                    <Text key={i} style={styles.constraintItem}>
                      • {c}
                    </Text>
                  ))}
                </View>
              )}

              <PrimaryButton
                onPress={() => handleStartDaily(todayDaily)}
                variant="primary"
                style={styles.dailyBtn}
              >
                {progress?.dailyHistory[todayDaily.dateStr]?.completed
                  ? "PRACTICE TODAY'S DRILL AGAIN"
                  : "SOLVE DAILY PROTOCOL (+350 XP)"}
              </PrimaryButton>
            </Card>
          )}

          {/* TAB 4: MASTERY & ACCURACY */}
          {tab === "mastery" && (
            <View>
              {/* Current Rank Banner */}
              <Card style={styles.masteryRankCard}>
                <View
                  style={[
                    styles.rankIconWrap,
                    { backgroundColor: `${masteryRank.color}20` },
                  ]}
                >
                  <Ionicons
                    name={masteryRank.badge as any}
                    size={36}
                    color={masteryRank.color}
                  />
                </View>
                <Text style={[styles.rankTitle, { color: masteryRank.color }]}>
                  {masteryRank.title.toUpperCase()}
                </Text>
                <Text style={styles.learningScoreVal}>
                  {progress?.learningScore || 0} Mastery Points
                </Text>
              </Card>

              {/* Strategy Metrics Grid */}
              <Card style={styles.metricsCard}>
                <Text style={styles.metricsHeader}>
                  TACTICAL STRATEGY EVALUATION
                </Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>OPTIMAL GUESS %</Text>
                    <Text style={styles.metricVal}>{strategyAccuracy}%</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>LESSONS COMPLETED</Text>
                    <Text style={styles.metricVal}>
                      {progress?.completedLessons.length || 0}
                    </Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>CHALLENGES BEATEN</Text>
                    <Text style={styles.metricVal}>
                      {progress?.completedChallenges.length || 0}
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* INTERACTIVE LESSON / SANDBOX MODAL */}
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Card style={styles.sandboxModal}>
              <View style={styles.sandboxHeader}>
                <Text style={styles.sandboxTitle}>
                  {activeLesson?.title ||
                    activeChallenge?.title ||
                    activeDaily?.title}
                </Text>
                <Pressable onPress={handleCloseSandbox} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              {/* REAL-TIME VISUAL RANGE SHRINKER */}
              <View style={styles.visualizerContainer}>
                <Text style={styles.visLabel}>CURRENT ACTIVE INTERVAL</Text>
                <Text style={styles.visBoundsText}>
                  [{sandboxLow} <Text style={styles.visDash}>—</Text>{" "}
                  {sandboxHigh}]
                </Text>
                <Text style={styles.visMidpointText}>
                  Theoretical Midpoint: floor(({sandboxLow} + {sandboxHigh}) /
                  2) = {Math.floor((sandboxLow + sandboxHigh) / 2)}
                </Text>
              </View>

              {/* Tries Left & Countdown Timer */}
              <View style={styles.triesRow}>
                <Text style={styles.triesText}>
                  Attempts: {sandboxGuesses.length} / {sandboxMaxGuesses}
                </Text>
                {timeRemaining !== null && (
                  <View style={styles.timerBadge}>
                    <Ionicons
                      name="timer-outline"
                      size={14}
                      color={timeRemaining <= 5 ? Colors.coral : Colors.accent}
                    />
                    <Text
                      style={[
                        styles.timerBadgeText,
                        timeRemaining <= 5 && { color: Colors.coral },
                      ]}
                    >
                      {timeRemaining}s left
                    </Text>
                  </View>
                )}
              </View>

              {/* Input Row */}
              {!solved && !failed && (
                <View style={styles.sandboxInputRow}>
                  <TextInput
                    style={styles.sandboxInput}
                    keyboardType="number-pad"
                    placeholder="Enter guess"
                    placeholderTextColor={Colors.textDim}
                    value={inputVal}
                    onChangeText={setInputVal}
                  />
                  <PrimaryButton
                    onPress={handleSubmitSandboxGuess}
                    variant="primary"
                    disabled={!inputVal.trim()}
                    style={styles.sandboxSubmitBtn}
                  >
                    TEST
                  </PrimaryButton>
                </View>
              )}

              {/* Victory or Defeat Message */}
              {solved && (
                <View style={styles.resultBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={32}
                    color={Colors.mint}
                  />
                  <Text style={styles.resultTitle}>
                    CORRECT TARGET DISCOVERED!
                  </Text>
                  <Text style={styles.resultText}>
                    Solved in {sandboxGuesses.length} attempt(s) with
                    mathematically verified bounds.
                  </Text>
                  <PrimaryButton
                    onPress={handleCloseSandbox}
                    variant="primary"
                    style={styles.continueBtn}
                  >
                    RETURN TO ACADEMY
                  </PrimaryButton>
                </View>
              )}

              {failed && (
                <View style={styles.resultBox}>
                  <Ionicons
                    name="close-circle"
                    size={32}
                    color={Colors.coral}
                  />
                  <Text style={[styles.resultTitle, { color: Colors.coral }]}>
                    OUT OF ATTEMPTS
                  </Text>
                  <Text style={styles.resultText}>
                    The secret was {sandboxSecret}. Review optimal midpoint
                    halving and try again!
                  </Text>
                  <PrimaryButton
                    onPress={handleCloseSandbox}
                    variant="secondary"
                    style={styles.continueBtn}
                  >
                    RETRY
                  </PrimaryButton>
                </View>
              )}

              {/* Evaluation History Feed */}
              <Text style={styles.feedTitle}>
                STEP-BY-STEP STRATEGY TELEMETRY
              </Text>
              <ScrollView
                style={styles.evalList}
                showsVerticalScrollIndicator={false}
              >
                {evaluations.map((ev, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.evalItem,
                      ev.optimality === "optimal" && styles.evalOptimal,
                      ev.optimality === "suboptimal" && styles.evalSuboptimal,
                      ev.optimality === "mistake" && styles.evalMistake,
                    ]}
                  >
                    <View style={styles.evalTop}>
                      <Text style={styles.evalGuessText}>
                        Guess #{idx + 1}: {ev.guess}
                      </Text>
                      <Text
                        style={[
                          styles.evalBadgeText,
                          ev.optimality === "optimal" && { color: Colors.mint },
                          ev.optimality === "suboptimal" && {
                            color: Colors.accent,
                          },
                          ev.optimality === "mistake" && {
                            color: Colors.coral,
                          },
                        ]}
                      >
                        {ev.optimality.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.evalReason}>{ev.reason}</Text>
                  </View>
                ))}
              </ScrollView>
            </Card>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 40,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.full,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  tabBtnActive: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
  },
  tabBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  tabBtnTextActive: {
    color: Colors.text,
    fontFamily: FontFamily.bodyBold,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  moduleSection: {
    marginBottom: 20,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  moduleTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
  },
  moduleDesc: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    marginBottom: 12,
  },
  lessonsGrid: {
    gap: 12,
  },
  lessonCard: {
    padding: 16,
  },
  lessonTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lessonTierBadge: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  lessonTierText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.mint,
  },
  lessonTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginBottom: 2,
  },
  lessonSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.accent,
    marginBottom: 6,
  },
  lessonSummary: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 10,
  },
  formulaBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 12,
  },
  formulaText: {
    fontSize: 11,
    fontFamily: FontFamily.mono,
    color: Colors.primary,
  },
  lessonBtn: {
    width: "100%",
  },
  practiceContainer: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  practiceCard: {
    padding: 16,
  },
  practiceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
  },
  xpBadge: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
  },
  practiceTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginBottom: 4,
  },
  practiceDesc: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 10,
  },
  practiceSpecs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  specItem: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  practiceBtn: {
    width: "100%",
  },
  dailyCard: {
    padding: 20,
    alignItems: "center",
  },
  dailyHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dailyHeaderBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  dailyTitle: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  dailyDesc: {
    fontSize: 13,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  dailySpecsGrid: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  dailySpecBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: "center",
  },
  dailySpecLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    marginBottom: 2,
  },
  dailySpecVal: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
  },
  constraintsCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 16,
  },
  constraintsLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    marginBottom: 4,
  },
  constraintItem: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.text,
  },
  dailyBtn: {
    width: "100%",
  },
  masteryRankCard: {
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  rankIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  rankTitle: {
    fontSize: 22,
    fontFamily: FontFamily.display,
    letterSpacing: 1,
    marginBottom: 4,
  },
  learningScoreVal: {
    fontSize: 14,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  metricsCard: {
    padding: 16,
  },
  metricsHeader: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 18,
    fontFamily: FontFamily.display,
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 16,
  },
  sandboxModal: {
    maxHeight: "90%",
    padding: 16,
  },
  sandboxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sandboxTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  visualizerContainer: {
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    borderRadius: Radius.md,
    alignItems: "center",
    marginBottom: 10,
  },
  visLabel: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 4,
  },
  visBoundsText: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 4,
  },
  visDash: {
    color: Colors.textDim,
  },
  visMidpointText: {
    fontSize: 11,
    fontFamily: FontFamily.mono,
    color: Colors.accent,
  },
  triesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  triesText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textDim,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  timerBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.mono,
    color: Colors.accent,
  },
  sandboxInputRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  sandboxInput: {
    flex: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: Radius.sm,
    paddingHorizontal: 16,
    color: Colors.text,
    fontFamily: FontFamily.display,
    fontSize: 18,
  },
  sandboxSubmitBtn: {
    minWidth: 90,
  },
  resultBox: {
    alignItems: "center",
    padding: 12,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.mint,
    marginTop: 6,
    marginBottom: 4,
  },
  resultText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    marginBottom: 12,
  },
  continueBtn: {
    width: "100%",
  },
  feedTitle: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  evalList: {
    maxHeight: 180,
  },
  evalItem: {
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  evalOptimal: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.mint,
  },
  evalSuboptimal: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  evalMistake: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.coral,
  },
  evalTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  evalGuessText: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
  },
  evalBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
  },
  evalReason: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 16,
  },
  });
