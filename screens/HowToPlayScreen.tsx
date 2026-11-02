import InteractiveTutorialModal from "@/components/tutorial/InteractiveTutorialModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TIPS = [
  {
    icon: "sparkles" as const,
    title: "Binary Search Strategy",
    body: "Always start by halving the search range (e.g. guessing 50 in a 1–100 match). Each guess eliminates 50% of the numbers remaining, leading to the fastest solves!",
  },
  {
    icon: "flame" as const,
    title: "Hot & Cold Proximity",
    body: "Real-time thermal sensors indicate how close your guess landed. 'BURNING HOT' means you are within 2 numbers! 'WARM' means you are closing in.",
  },
  {
    icon: "bulb" as const,
    title: "Oracle Smart Hints",
    body: "Consult the Oracle for mathematical intel: Parity (Even/Odd), Range Focus, Divisibility factors, or Digit sums without spoiling the answer.",
  },
  {
    icon: "pause" as const,
    title: "Pause & Safe Restarts",
    body: "Need a break? Pause single-player matches anytime. Time freezes completely while the board is shielded to prevent unfair advantages.",
  },
  {
    icon: "speedometer" as const,
    title: "Adaptive Difficulty",
    body: "The Oracle observes your match win rates and suggests when you're ready to step up to Hard or Expert for greater score multipliers!",
  },
  {
    icon: "trophy" as const,
    title: "Scoring & Badges",
    body: "Scores reward fewer rounds, fast times, and tough difficulties. Conserving hints and playing on harder difficulties unlocks rare achievements.",
  },
];

export default function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  const { buzz, playSound, updateSettings } = useGame();
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                buzz("light");
                playSound("button_click");
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
              <Title size="lg">How to Play</Title>
            </View>
            <View style={{ width: 42 }} />
          </View>

          <Text style={styles.subtitle}>
            Tactical rules and game mechanics for mastering Guess My Number
          </Text>

          {/* Interactive Tutorial Launcher Banner */}
          <View style={styles.tutorialHero}>
            <View style={styles.tutorialHeroLeft}>
              <Ionicons name="school" size={24} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tutorialHeroTitle}>Interactive Tutorial</Text>
                <Text style={styles.tutorialHeroDesc}>
                  Learn binary search, smart hints, and proximity mechanics step-by-step.
                </Text>
              </View>
            </View>
            <PrimaryButton
              variant="accent"
              size="md"
              onPress={() => {
                buzz("light");
                playSound("button_click");
                setShowTutorial(true);
              }}
              icon={<Ionicons name="play" size={16} color={Colors.bg} />}
              style={{ marginTop: 12 }}
            >
              Start Interactive Guide
            </PrimaryButton>
          </View>

          {/* Cards */}
          <View style={styles.cardsList}>
            {TIPS.map((tip, i) => (
              <View key={tip.title} style={styles.tipCard}>
                <View style={styles.tipTop}>
                  <View style={styles.indexBadge}>
                    <Text style={styles.indexText}>
                      {String(i + 1).padStart(2, "0")}
                    </Text>
                  </View>
                  <Ionicons name={tip.icon} size={16} color={Colors.primary} />
                </View>
                <Text style={styles.title}>{tip.title}</Text>
                <Text style={styles.body}>{tip.body}</Text>
              </View>
            ))}
          </View>

          <PrimaryButton
            variant="secondary"
            size="lg"
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onBack();
            }}
            icon={<Ionicons name="checkmark-circle" size={18} color={Colors.text} />}
            style={{ marginTop: 24 }}
          >
            Ready to Play
          </PrimaryButton>
        </ScrollView>

        {/* Interactive Tutorial Modal */}
        <InteractiveTutorialModal
          visible={showTutorial}
          onClose={() => setShowTutorial(false)}
          onFinish={() => {
            setShowTutorial(false);
            updateSettings({ tutorialCompleted: true });
          }}
        />
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
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
  },
  tutorialHero: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.accent + "50",
    marginBottom: 16,
  },
  tutorialHeroLeft: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  tutorialHeroTitle: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 15,
  },
  tutorialHeroDesc: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  cardsList: {
    gap: 10,
  },
  tipCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tipTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  indexBadge: {
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  indexText: {
    fontFamily: FontFamily.display,
    color: Colors.textDim,
    fontSize: 11,
  },
  title: {
    fontFamily: FontFamily.display,
    color: Colors.text,
    fontSize: 14,
    marginBottom: 4,
  },
  body: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
