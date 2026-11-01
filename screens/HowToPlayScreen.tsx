import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TIPS = [
  {
    title: "Oracle Guesses",
    body: "Secretly pick a number, then tell the oracle if its guess is higher or lower. Be honest — lying breaks the hunt.",
  },
  {
    title: "You Guess",
    body: "The oracle hides a number. Each wrong guess costs a life. Use hints wisely — they lower your score.",
  },
  {
    title: "Difficulty",
    body: "Harder ranges mean bigger score multipliers, fewer hints, and tighter lives in You Guess mode.",
  },
  {
    title: "Daily Challenge",
    body: "One shared Medium puzzle every day. Finish it to unlock the Daily Devotee badge.",
  },
  {
    title: "Scoring",
    body: "Faster wins with fewer rounds score higher. Hints reduce points. Player mode adds a bonus.",
  },
];

export default function HowToPlayScreen({ onBack }: { onBack: () => void }) {
  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Title>How to Play</Title>
          <Text style={styles.sub}>Master the oracle in minutes</Text>

          {TIPS.map((tip, i) => (
            <View key={tip.title} style={styles.card}>
              <Text style={styles.index}>{String(i + 1).padStart(2, "0")}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{tip.title}</Text>
                <Text style={styles.body}>{tip.body}</Text>
              </View>
            </View>
          ))}

          <PrimaryButton variant="accent" onPress={onBack}>
            Got it
          </PrimaryButton>
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
    marginVertical: 12,
  },
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  index: {
    fontFamily: "play-fair-bold",
    color: Colors.primary,
    fontSize: 18,
  },
  title: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 16,
  },
  body: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
    fontSize: 14,
  },
});
