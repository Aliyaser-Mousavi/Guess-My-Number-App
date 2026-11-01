import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { ACHIEVEMENTS } from "@/constants/gameConfig";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  trophy: "trophy",
  flame: "flame",
  rocket: "rocket",
  flash: "flash",
  bulb: "bulb",
  skull: "skull",
  search: "search",
  calendar: "calendar",
  medal: "medal",
  ribbon: "ribbon",
  star: "star",
  "eye-off": "eye-off",
};

export default function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const { stats } = useGame();
  const unlocked = new Set(stats.unlockedAchievements);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Title>Achievements</Title>
          <Text style={styles.sub}>
            {unlocked.size} of {ACHIEVEMENTS.length} unlocked
          </Text>

          {ACHIEVEMENTS.map((a) => {
            const isOn = unlocked.has(a.id);
            return (
              <View
                key={a.id}
                style={[styles.card, !isOn && styles.locked]}
              >
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor: isOn
                        ? Colors.accentGlow
                        : Colors.bgElevated,
                    },
                  ]}
                >
                  <Ionicons
                    name={ICON_MAP[a.icon] ?? "ribbon"}
                    size={22}
                    color={isOn ? Colors.accent : Colors.textDim}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !isOn && { color: Colors.textDim }]}>
                    {a.title}
                  </Text>
                  <Text style={styles.desc}>{a.description}</Text>
                </View>
                {isOn && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                )}
              </View>
            );
          })}
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
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locked: { opacity: 0.7 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "play-fair-bold",
    color: Colors.text,
    fontSize: 16,
  },
  desc: {
    fontFamily: "play-fair",
    color: Colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
