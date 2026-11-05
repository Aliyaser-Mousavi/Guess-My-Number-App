// ==============================================================================
// Screen: StrategyCoachScreen.tsx
// Description: AI Strategy Coach & Intelligent Challenges (Group 10).
//              Historical gameplay analytics, efficiency rating, grounded
//              recommendations, deep links to Academy, and tailored practice drills.
// ==============================================================================

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { AcademyService } from "@/services/academy/AcademyService";
import { CoachEngine } from "@/services/coach/CoachEngine";
import type {
  CoachEvaluationReport,
  IntelligentDailyChallenge,
  PersonalizedRecommendation,
  TailoredPracticeChallenge,
} from "@/types/coach";
import type { GuessEvaluation } from "@/types/academy";
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

type CoachTab = "insights" | "tailored" | "daily";

type Props = {
  onBack: () => void;
  onNavigateToAcademy?: () => void;
};

export default function StrategyCoachScreen({
  onBack,
  onNavigateToAcademy,
}: Props) {
  const { buzz, playSound, isRTL, history, awardProgressionXp } = useGame();

  const [tab, setTab] = useState<CoachTab>("insights");

  // Derive report and drills directly during render via useMemo
  const report = React.useMemo(() => {
    return CoachEngine.evaluateGameplayHistory(history);
  }, [history]);

  const tailoredDrills = React.useMemo(() => {
    return CoachEngine.generateTailoredChallenges(report);
  }, [report]);

  const dailyChallenge = React.useMemo(() => {
    return CoachEngine.getIntelligentDailyChallenge();
  }, []);

  // Save report snapshot asynchronously in effect without setState
  useEffect(() => {
    if (report) {
      CoachEngine.saveReport(report).catch(() => {});
    }
  }, [report]);

  // Active Drill / Practice Sandbox State
  const [activeDrill, setActiveDrill] =
    useState<TailoredPracticeChallenge | null>(null);
  const [activeDaily, setActiveDaily] =
    useState<IntelligentDailyChallenge | null>(null);
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

  const clearDrillTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Timed Drill Countdown Enforcement
  const isTimerActive = timeRemaining !== null && timeRemaining > 0;
  useEffect(() => {
    if (!isTimerActive) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearDrillTimer();
          setFailed(true);
          buzz("error");
          playSound("defeat");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearDrillTimer();
    };
  }, [isTimerActive, clearDrillTimer, buzz, playSound]);

  // Start a tailored practice challenge
  const handleStartDrill = (drill: TailoredPracticeChallenge) => {
    buzz("light");
    playSound("button_click");
    clearDrillTimer();
    setActiveDrill(drill);
    setActiveDaily(null);
    setSandboxLow(drill.range.min);
    setSandboxHigh(drill.range.max);
    setSandboxSecret(drill.secretNumber);
    setSandboxMaxGuesses(drill.maxAttempts);
    setSandboxGuesses([]);
    setEvaluations([]);
    setInputVal("");
    setSolved(false);
    setFailed(false);
    setTimeRemaining(drill.timeLimitSeconds ?? null);
  };

  // Start daily intelligent challenge
  const handleStartDaily = (daily: IntelligentDailyChallenge) => {
    buzz("light");
    playSound("button_click");
    clearDrillTimer();
    setActiveDaily(daily);
    setActiveDrill(null);
    setSandboxLow(daily.range.min);
    setSandboxHigh(daily.range.max);
    setSandboxSecret(daily.secretNumber);
    setSandboxMaxGuesses(daily.maxAttempts);
    setSandboxGuesses([]);
    setEvaluations([]);
    setInputVal("");
    setSolved(false);
    setFailed(false);
    setTimeRemaining(daily.timeLimitSeconds ?? null);
  };

  // Submit guess in coach sandbox
  const handleSubmitGuess = () => {
    const num = parseInt(inputVal, 10);
    if (isNaN(num)) return;

    buzz("light");
    playSound("guess_submit");

    const constraints = activeDrill?.constraints || activeDaily?.constraints;
    const evaluation = AcademyService.evaluateGuess(
      num,
      sandboxLow,
      sandboxHigh,
      constraints,
    );

    const nextEvaluations = [...evaluations, evaluation];
    const nextGuesses = [...sandboxGuesses, num];

    setEvaluations(nextEvaluations);
    setSandboxGuesses(nextGuesses);
    setInputVal("");

    if (num === sandboxSecret) {
      clearDrillTimer();
      setSolved(true);
      buzz("success");
      playSound("victory");

      const xp = activeDrill?.rewardXp || activeDaily?.rewardXp || 250;
      awardProgressionXp(xp);
      Alert.alert(
        "Drill Mastered!",
        `You completed the drill with precision and earned +${xp} XP!`,
      );
      return;
    }

    if (num < sandboxSecret) {
      setSandboxLow((prev) => Math.max(prev, num + 1));
      playSound("guess_wrong");
    } else {
      setSandboxHigh((prev) => Math.min(prev, num - 1));
      playSound("guess_wrong");
    }

    if (nextGuesses.length >= sandboxMaxGuesses) {
      clearDrillTimer();
      setFailed(true);
      buzz("error");
      playSound("defeat");
    }
  };

  const handleCloseSandbox = () => {
    buzz("light");
    clearDrillTimer();
    setActiveDrill(null);
    setActiveDaily(null);
    setTimeRemaining(null);
  };

  const isModalOpen = Boolean(activeDrill || activeDaily);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            onPress={onBack}
          >
            <Ionicons
              name={isRTL ? "chevron-forward" : "chevron-back"}
              size={24}
              color={Colors.text}
            />
          </Pressable>
          <Title style={styles.title}>AI STRATEGY COACH</Title>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, tab === "insights" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("insights");
            }}
          >
            <Ionicons
              name="analytics"
              size={14}
              color={tab === "insights" ? Colors.primary : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "insights" && styles.tabBtnTextActive,
              ]}
            >
              INSIGHTS
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, tab === "tailored" && styles.tabBtnActive]}
            onPress={() => {
              buzz("light");
              setTab("tailored");
            }}
          >
            <Ionicons
              name="fitness"
              size={14}
              color={tab === "tailored" ? Colors.primary : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "tailored" && styles.tabBtnTextActive,
              ]}
            >
              TAILORED DRILLS
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
              name="sparkles"
              size={14}
              color={tab === "daily" ? Colors.primary : Colors.textDim}
            />
            <Text
              style={[
                styles.tabBtnText,
                tab === "daily" && styles.tabBtnTextActive,
              ]}
            >
              DAILY LOGIC
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* TAB 1: INSIGHTS & ANALYTICS */}
          {tab === "insights" && report && (
            <View style={styles.tabContent}>
              {/* Overall Efficiency Card */}
              <Card style={styles.efficiencyCard}>
                <View style={styles.efficiencyHeaderRow}>
                  <View style={styles.efficiencyBadge}>
                    <Ionicons name="hardware-chip" size={18} color={Colors.primary} />
                    <Text style={styles.efficiencyBadgeText}>
                      TACTICAL RATING
                    </Text>
                  </View>
                  {report.metrics.historicalEfficiencyTrend !== 0 && (
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color:
                            report.metrics.historicalEfficiencyTrend > 0
                              ? Colors.mint
                              : Colors.coral,
                        },
                      ]}
                    >
                      {report.metrics.historicalEfficiencyTrend > 0 ? "+" : ""}
                      {report.metrics.historicalEfficiencyTrend} recent trend
                    </Text>
                  )}
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.scoreVal}>{report.efficiencyScore}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>

                <Text style={styles.rankTitle}>
                  {report.efficiencyRankTitle.toUpperCase()}
                </Text>
                <Text style={styles.coachSummaryText}>
                  {report.coachingSummary}
                </Text>
              </Card>

              {/* Metrics Breakdown Grid */}
              <Card style={styles.metricsCard}>
                <Text style={styles.sectionTitle}>GAMEPLAY TELEMETRY</Text>
                <View style={styles.metricGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {report.metrics.suboptimalGuessRate}%
                    </Text>
                    <Text style={styles.metricLabel}>SUBOPTIMAL GUESSES</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {report.metrics.boundaryWasteRate}%
                    </Text>
                    <Text style={styles.metricLabel}>OUT-OF-BOUNDS</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {report.metrics.averageSecondsPerGuess}s
                    </Text>
                    <Text style={styles.metricLabel}>AVG TIME / GUESS</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>
                      {report.metrics.hintRelianceRatio}
                    </Text>
                    <Text style={styles.metricLabel}>HINTS / MATCH</Text>
                  </View>
                </View>
              </Card>

              {/* Strengths & Weaknesses */}
              <View style={styles.cardsRow}>
                {/* Strengths */}
                {report.strengths.length > 0 && (
                  <Card style={styles.halfCard}>
                    <View style={styles.cardHeaderRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={Colors.mint}
                      />
                      <Text style={[styles.cardHeading, { color: Colors.mint }]}>
                        PROVEN STRENGTHS
                      </Text>
                    </View>
                    {report.strengths.map((s, idx) => (
                      <View key={idx} style={styles.pointItem}>
                        <Text style={styles.pointTitle}>{s.title}</Text>
                        <Text style={styles.pointDesc}>{s.description}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                {/* Weaknesses */}
                {report.weaknesses.length > 0 && (
                  <Card style={styles.halfCard}>
                    <View style={styles.cardHeaderRow}>
                      <Ionicons
                        name="alert-circle"
                        size={18}
                        color={Colors.accent}
                      />
                      <Text
                        style={[styles.cardHeading, { color: Colors.accent }]}
                      >
                        TARGETED WEAKNESSES
                      </Text>
                    </View>
                    {report.weaknesses.map((w, idx) => (
                      <View key={idx} style={styles.pointItem}>
                        <Text style={styles.pointTitle}>{w.title}</Text>
                        <Text style={styles.pointDesc}>{w.description}</Text>
                      </View>
                    ))}
                  </Card>
                )}
              </View>

              {/* Actionable Recommendations */}
              <Text style={styles.sectionHeader}>COACH RECOMMENDATIONS</Text>
              {report.recommendations.map((rec) => (
                <Card key={rec.id} style={styles.recCard}>
                  <View style={styles.recTopRow}>
                    <View
                      style={[
                        styles.severityPill,
                        rec.severity === "critical"
                          ? styles.sevCrit
                          : styles.sevWarn,
                      ]}
                    >
                      <Text style={styles.severityText}>
                        {rec.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.recCategory}>
                      {rec.category.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recDiagnosis}>{rec.diagnosis}</Text>

                  <View style={styles.prescriptionBox}>
                    <Ionicons
                      name="bulb-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.prescriptionText}>
                      {rec.tacticalPrescription}
                    </Text>
                  </View>

                  {rec.recommendedAcademyModuleId && onNavigateToAcademy && (
                    <PrimaryButton
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        onNavigateToAcademy();
                      }}
                      variant="secondary"
                      style={styles.academyLinkBtn}
                    >
                      OPEN ACADEMY DRILL
                    </PrimaryButton>
                  )}
                </Card>
              ))}
            </View>
          )}

          {/* TAB 2: TAILORED PRACTICE DRILLS */}
          {tab === "tailored" && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionHeader}>
                CALIBRATED TO YOUR WEAKNESSES
              </Text>
              {tailoredDrills.map((drill) => (
                <Card key={drill.id} style={styles.drillCard}>
                  <View style={styles.drillTopRow}>
                    <View style={styles.weaknessPill}>
                      <Text style={styles.weaknessPillText}>
                        {drill.targetedWeakness.replace(/_/g, " ").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.xpBadge}>+{drill.rewardXp} XP</Text>
                  </View>

                  <Text style={styles.drillTitle}>{drill.title}</Text>
                  <Text style={styles.drillDesc}>{drill.description}</Text>

                  <View style={styles.briefBox}>
                    <Text style={styles.briefLabel}>TACTICAL BRIEF</Text>
                    <Text style={styles.briefText}>{drill.tacticalBrief}</Text>
                  </View>

                  <View style={styles.specRow}>
                    <Text style={styles.specText}>
                      Range: {drill.range.min}–{drill.range.max}
                    </Text>
                    <Text style={styles.specText}>
                      Max Attempts: {drill.maxAttempts}
                    </Text>
                    {drill.timeLimitSeconds && (
                      <Text style={styles.specText}>
                        Timer: {drill.timeLimitSeconds}s
                      </Text>
                    )}
                  </View>

                  <PrimaryButton
                    onPress={() => handleStartDrill(drill)}
                    variant="primary"
                    style={styles.startDrillBtn}
                  >
                    LAUNCH DRILL
                  </PrimaryButton>
                </Card>
              ))}
            </View>
          )}

          {/* TAB 3: INTELLIGENT DAILY LOGIC CHALLENGE */}
          {tab === "daily" && dailyChallenge && (
            <View style={styles.tabContent}>
              <Card style={styles.dailyCard}>
                <View style={styles.dailyHeaderBadge}>
                  <Ionicons name="sparkles" size={16} color={Colors.accent} />
                  <Text style={styles.dailyHeaderBadgeText}>
                    ALGORITHMIC DAILY SEED
                  </Text>
                </View>

                <Text style={styles.dailyTitle}>{dailyChallenge.title}</Text>
                <Text style={styles.dailyDesc}>{dailyChallenge.description}</Text>

                <View style={styles.rulesContainer}>
                  <Text style={styles.rulesHeader}>ACTIVE PROTOCOL RULES</Text>
                  {dailyChallenge.specialRules.map((rule, idx) => (
                    <View key={idx} style={styles.ruleItem}>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.ruleItemText}>{rule}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specText}>
                    Range: {dailyChallenge.range.min}–{dailyChallenge.range.max}
                  </Text>
                  <Text style={styles.specText}>
                    Attempts: {dailyChallenge.maxAttempts}
                  </Text>
                  <Text style={styles.specText}>
                    Timer: {dailyChallenge.timeLimitSeconds}s
                  </Text>
                </View>

                <PrimaryButton
                  onPress={() => handleStartDaily(dailyChallenge)}
                  variant="accent"
                  style={styles.startDailyBtn}
                >
                  START DAILY CHALLENGE
                </PrimaryButton>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* ACTIVE DRILL / CHALLENGE MODAL */}
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View style={styles.modalBackdrop}>
            <Card style={styles.sandboxModal}>
              <View style={styles.sandboxHeader}>
                <Text style={styles.sandboxTitle}>
                  {activeDrill?.title || activeDaily?.title}
                </Text>
                <Pressable onPress={handleCloseSandbox} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              {/* Range Shrinker */}
              <View style={styles.visualizerContainer}>
                <Text style={styles.visLabel}>CURRENT ACTIVE BOUNDS</Text>
                <Text style={styles.visBoundsText}>
                  [{sandboxLow} <Text style={styles.visDash}>—</Text>{" "}
                  {sandboxHigh}]
                </Text>
                <Text style={styles.visMidpointText}>
                  Calculated Optimal Midpoint: floor(({sandboxLow} +{" "}
                  {sandboxHigh}) / 2) ={" "}
                  {Math.floor((sandboxLow + sandboxHigh) / 2)}
                </Text>
              </View>

              {/* Tries Left & Timer */}
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
                    onPress={handleSubmitGuess}
                    variant="primary"
                    disabled={!inputVal.trim()}
                    style={styles.sandboxSubmitBtn}
                  >
                    TEST
                  </PrimaryButton>
                </View>
              )}

              {/* Result State */}
              {solved && (
                <View style={styles.resultBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={32}
                    color={Colors.mint}
                  />
                  <Text style={styles.resultTitle}>DRILL SOLVED!</Text>
                  <Text style={styles.resultText}>
                    Solved in {sandboxGuesses.length} attempts with verified
                    bisection discipline.
                  </Text>
                  <PrimaryButton
                    onPress={handleCloseSandbox}
                    variant="primary"
                    style={styles.continueBtn}
                  >
                    RETURN TO COACH
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
                    DRILL FAILED
                  </Text>
                  <Text style={styles.resultText}>
                    Target was {sandboxSecret}. Focus on optimal interval
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

              {/* Strategy Telemetry Feed */}
              <Text style={styles.feedTitle}>GUESS TELEMETRY & FEEDBACK</Text>
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
  rowReverse: {
    flexDirection: "row-reverse",
  },
  backBtn: {
    padding: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    letterSpacing: 2,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tabBtnActive: {
    backgroundColor: "rgba(0, 210, 180, 0.15)",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
  },
  tabBtnTextActive: {
    color: Colors.primary,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  efficiencyCard: {
    padding: 20,
    alignItems: "center",
  },
  efficiencyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  efficiencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 210, 180, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  efficiencyBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    color: Colors.primary,
  },
  trendText: {
    fontSize: 11,
    fontFamily: FontFamily.bodySemiBold,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginVertical: 4,
  },
  scoreVal: {
    fontSize: 56,
    fontFamily: FontFamily.display,
    color: Colors.primary,
  },
  scoreMax: {
    fontSize: 20,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    marginLeft: 4,
  },
  rankTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  coachSummaryText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 18,
  },
  metricsCard: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FontFamily.mono,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricVal: {
    fontSize: 16,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 8,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.textDim,
    textAlign: "center",
  },
  cardsRow: {
    flexDirection: "column",
    gap: 12,
  },
  halfCard: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cardHeading: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    letterSpacing: 1,
  },
  pointItem: {
    marginBottom: 8,
  },
  pointTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bodySemiBold,
    color: Colors.text,
    marginBottom: 2,
  },
  pointDesc: {
    fontSize: 11,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  recCard: {
    padding: 16,
  },
  recTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  severityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  sevCrit: {
    backgroundColor: "rgba(255, 92, 114, 0.2)",
  },
  sevWarn: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
  },
  severityText: {
    fontSize: 9,
    fontFamily: FontFamily.mono,
    color: Colors.text,
  },
  recCategory: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    color: Colors.textDim,
  },
  recTitle: {
    fontSize: 15,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginBottom: 4,
  },
  recDiagnosis: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 10,
  },
  prescriptionBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(0, 210, 180, 0.08)",
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  prescriptionText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.primary,
    lineHeight: 16,
  },
  academyLinkBtn: {
    marginTop: 4,
  },
  drillCard: {
    padding: 16,
  },
  drillTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  weaknessPill: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  weaknessPillText: {
    fontSize: 9,
    fontFamily: FontFamily.mono,
    color: Colors.accent,
  },
  xpBadge: {
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
    color: Colors.mint,
  },
  drillTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    marginBottom: 4,
  },
  drillDesc: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 16,
    marginBottom: 10,
  },
  briefBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 10,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  briefLabel: {
    fontSize: 9,
    fontFamily: FontFamily.mono,
    color: Colors.primary,
    marginBottom: 2,
  },
  briefText: {
    fontSize: 11,
    fontFamily: FontFamily.bodyMedium,
    color: Colors.text,
    lineHeight: 15,
  },
  specRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  specText: {
    fontSize: 11,
    fontFamily: FontFamily.mono,
    color: Colors.textDim,
  },
  startDrillBtn: {
    marginTop: 2,
  },
  dailyCard: {
    padding: 20,
  },
  dailyHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  dailyHeaderBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    color: Colors.accent,
  },
  dailyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.display,
    color: Colors.text,
    marginBottom: 6,
  },
  dailyDesc: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 18,
    marginBottom: 14,
  },
  rulesContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 14,
  },
  rulesHeader: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    color: Colors.primary,
    marginBottom: 8,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  ruleItemText: {
    fontSize: 12,
    fontFamily: FontFamily.body,
    color: Colors.text,
  },
  startDailyBtn: {
    marginTop: 4,
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
    lineHeight: 16,
    marginBottom: 10,
  },
  continueBtn: {
    minWidth: 160,
  },
  feedTitle: {
    fontSize: 10,
    fontFamily: FontFamily.mono,
    color: Colors.textDim,
    letterSpacing: 1,
    marginBottom: 8,
  },
  evalList: {
    maxHeight: 180,
  },
  evalItem: {
    padding: 8,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: Colors.textDim,
  },
  evalOptimal: {
    borderLeftColor: Colors.mint,
    backgroundColor: "rgba(0, 210, 180, 0.05)",
  },
  evalSuboptimal: {
    borderLeftColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.05)",
  },
  evalMistake: {
    borderLeftColor: Colors.coral,
    backgroundColor: "rgba(255, 92, 114, 0.05)",
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
    fontFamily: FontFamily.mono,
  },
  evalReason: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    color: Colors.textDim,
    lineHeight: 14,
  },
});

