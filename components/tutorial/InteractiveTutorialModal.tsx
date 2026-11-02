import PrimaryButton from "@/components/ui/PrimaryButton";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
};

type Step = {
  title: string;
  badge: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  body: string;
  interactiveType?: "guess_demo" | "proximity_demo" | "hints_demo";
};

const STEPS: Step[] = [
  {
    title: "The Mystery Number",
    badge: "FUNDAMENTALS",
    icon: "sparkles",
    color: Colors.accent,
    body: "The Oracle selects a secret number within a chosen range (e.g. 1 to 100). Your mission is to deduce the exact number using feedback before running out of lives or time.",
  },
  {
    title: "Binary Search Strategy",
    badge: "PRO STRATEGY",
    icon: "git-branch-outline",
    color: "#00E5FF",
    body: "Never guess randomly! Guessing the middle number (e.g. 50 in a 1–100 range) cuts the possibilities in half with a single turn. Watch the Range Bar narrow as you zero in!",
    interactiveType: "guess_demo",
  },
  {
    title: "Hot & Cold Proximity",
    badge: "THERMAL SENSORS",
    icon: "flame",
    color: "#FF3B30",
    body: "Proximity feedback reveals how close your guess landed. 'BURNING HOT' means you are within 2 numbers! 'WARM' means you are closing in. Use this to fine-tune your next move.",
    interactiveType: "proximity_demo",
  },
  {
    title: "Oracle Smart Hints",
    badge: "INTEL SYSTEM",
    icon: "bulb",
    color: "#9C88FF",
    body: "Stuck in a tough bracket? Consult the Oracle! Smart hints provide mathematical properties: Parity (Even/Odd), Range Focus, Divisibility, and Digit relationships without spoiling the answer.",
    interactiveType: "hints_demo",
  },
  {
    title: "Score Multipliers",
    badge: "MASTERY",
    icon: "trophy",
    color: Colors.mint,
    body: "Each difficulty level multiplies your final score (up to 3.5x on Expert!). Fewer rounds, faster solves, and zero hints award huge bonuses and unlock badges. You are ready to hunt!",
  },
];

export default function InteractiveTutorialModal({
  visible,
  onClose,
  onFinish,
}: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [simulatedGuess, setSimulatedGuess] = useState<number | null>(null);
  const { buzz } = useGame();

  const step = STEPS[currentStep];

  function handleNext() {
    buzz("light");
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
      setSimulatedGuess(null);
    } else {
      buzz("success");
      onFinish();
    }
  }

  function handlePrev() {
    buzz("light");
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setSimulatedGuess(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.badgeWrap,
                { backgroundColor: step.color + "20" },
              ]}
            >
              <Ionicons name={step.icon} size={14} color={step.color} />
              <Text style={[styles.badgeText, { color: step.color }]}>
                {step.badge}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                buzz("light");
                onClose();
              }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>

          {/* Icon Circle */}
          <View
            style={[
              styles.iconCircle,
              {
                borderColor: step.color + "50",
                backgroundColor: step.color + "15",
              },
            ]}
          >
            <Ionicons name={step.icon} size={32} color={step.color} />
          </View>

          <Title size="md">{step.title}</Title>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {STEPS.length}
          </Text>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.bodyText}>{step.body}</Text>

            {/* Interactive Demo Widget for Binary Search */}
            {step.interactiveType === "guess_demo" && (
              <View style={styles.demoCard}>
                <Text style={styles.demoHeader}>TRY IT: RANGE 1 – 100</Text>
                <View style={styles.demoButtonsRow}>
                  <Pressable
                    onPress={() => {
                      buzz("medium");
                      setSimulatedGuess(50);
                    }}
                    style={[
                      styles.demoPill,
                      simulatedGuess === 50 && styles.demoPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        simulatedGuess === 50 && styles.demoPillTextActive,
                      ]}
                    >
                      Guess 50 (Half)
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      buzz("medium");
                      setSimulatedGuess(20);
                    }}
                    style={[
                      styles.demoPill,
                      simulatedGuess === 20 && styles.demoPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.demoPillText,
                        simulatedGuess === 20 && styles.demoPillTextActive,
                      ]}
                    >
                      Guess 20 (Random)
                    </Text>
                  </Pressable>
                </View>

                {simulatedGuess === 50 && (
                  <View style={styles.demoResult}>
                    <Ionicons name="arrow-up" size={16} color={Colors.accent} />
                    <Text style={styles.demoResultText}>
                      TOO LOW! Instantly eliminates 1–50. Remaining: 51–100 (50% reduction!)
                    </Text>
                  </View>
                )}
                {simulatedGuess === 20 && (
                  <View style={styles.demoResult}>
                    <Ionicons name="arrow-up" size={16} color={Colors.coral} />
                    <Text style={styles.demoResultText}>
                      TOO LOW! Only eliminates 1–20. 80 numbers still left to test.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Interactive Demo for Proximity */}
            {step.interactiveType === "proximity_demo" && (
              <View style={styles.demoCard}>
                <Text style={styles.demoHeader}>THERMAL READOUT EXAMPLES</Text>
                <View style={styles.proximityRows}>
                  <View style={[styles.sampleProx, { borderColor: "#FF3B3060" }]}>
                    <Ionicons name="flame" size={16} color="#FF3B30" />
                    <Text style={[styles.sampleProxText, { color: "#FF3B30" }]}>
                      BURNING HOT • 1-2 numbers away
                    </Text>
                  </View>
                  <View style={[styles.sampleProx, { borderColor: "#FFCC0060" }]}>
                    <Ionicons name="sunny" size={16} color="#FFCC00" />
                    <Text style={[styles.sampleProxText, { color: "#FFCC00" }]}>
                      WARM • Getting closer
                    </Text>
                  </View>
                  <View style={[styles.sampleProx, { borderColor: "#007AFF60" }]}>
                    <Ionicons name="cube" size={16} color="#007AFF" />
                    <Text style={[styles.sampleProxText, { color: "#007AFF" }]}>
                      FREEZING COLD • Way off target
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Interactive Demo for Hints */}
            {step.interactiveType === "hints_demo" && (
              <View style={styles.demoCard}>
                <Text style={styles.demoHeader}>SAMPLE ORACLE CLUES</Text>
                <Text style={styles.clueSample}>
                  • &quot;The secret number is an EVEN number.&quot;
                </Text>
                <Text style={styles.clueSample}>
                  • &quot;The secret number is evenly divisible by 7.&quot;
                </Text>
                <Text style={styles.clueSample}>
                  • &quot;The sum of its digits equals 9.&quot;
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentStep && {
                    backgroundColor: step.color,
                    width: 22,
                  },
                ]}
              />
            ))}
          </View>

          {/* Action Controls */}
          <View style={styles.controlsRow}>
            {currentStep > 0 ? (
              <PrimaryButton
                variant="secondary"
                size="md"
                onPress={handlePrev}
                style={{ flex: 1 }}
              >
                Previous
              </PrimaryButton>
            ) : null}

            <PrimaryButton
              variant="accent"
              size="md"
              onPress={handleNext}
              style={{ flex: 2 }}
              icon={
                <Ionicons
                  name={
                    currentStep === STEPS.length - 1
                      ? "checkmark-circle"
                      : "arrow-forward"
                  }
                  size={18}
                  color={Colors.bg}
                />
              }
            >
              {currentStep === STEPS.length - 1 ? "Start Playing" : "Next Step"}
            </PrimaryButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 26, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: 22,
    alignItems: "center",
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.textDim,
    fontSize: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  stepCounter: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
    marginBottom: 10,
  },
  bodyScroll: {
    maxHeight: 240,
    width: "100%",
    marginVertical: 4,
  },
  bodyText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 12,
  },
  demoCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  demoHeader: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: "center",
  },
  demoButtonsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  demoPill: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoPillActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  demoPillText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.textMuted,
    fontSize: 11,
  },
  demoPillTextActive: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
  },
  demoResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    padding: 8,
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.sm,
  },
  demoResultText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.text,
    lineHeight: 15,
  },
  proximityRows: {
    gap: 6,
  },
  sampleProx: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  sampleProxText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 11,
  },
  clueSample: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginVertical: 2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 14,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  controlsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
});

