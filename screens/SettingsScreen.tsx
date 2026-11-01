import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings, resetStats, buzz } = useGame();
  const { showAlert } = useAppAlert();

  function confirmReset() {
    showAlert(
      "Reset all progress?",
      "Stats, streaks, and achievements will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            resetStats();
            buzz("error");
          },
        },
      ],
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Title>Settings</Title>

          <ToggleRow
            label="Haptic feedback"
            value={settings.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
          <ToggleRow
            label="Show timer"
            value={settings.showTimer}
            onChange={(v) => updateSettings({ showTimer: v })}
          />
          <ToggleRow
            label="Show range bar"
            value={settings.showRangeBar}
            onChange={(v) => updateSettings({ showRangeBar: v })}
          />

          <PrimaryButton
            variant="danger"
            onPress={confirmReset}
            style={{ marginTop: 28 }}
          >
            Reset Progress
          </PrimaryButton>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.surfaceSoft, true: Colors.primary }}
        thumbColor={Colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24 },
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontFamily: "play-fair",
    color: Colors.text,
    fontSize: 16,
  },
});
