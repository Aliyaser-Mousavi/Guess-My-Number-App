import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, StyleSheet, Switch, Text, View } from "react-native";

type Props = {
  visible: boolean;
  modeTitle?: string;
  onResume: () => void;
  onRestart: () => void;
  onAbandon: () => void;
};

export default function PauseModal({
  visible,
  modeTitle = "Match Paused",
  onResume,
  onRestart,
  onAbandon,
}: Props) {
  const { settings, updateSettings, buzz } = useGame();
  const { showAlert } = useAppAlert();

  function confirmRestart() {
    buzz("medium");
    showAlert(
      "Restart Match?",
      "Are you sure you want to restart this match? Your current guesses and progress will be reset.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restart",
          onPress: () => {
            buzz("light");
            onRestart();
          },
        },
      ],
    );
  }

  function confirmAbandon() {
    buzz("medium");
    showAlert(
      "Abandon Match?",
      "Return to the main menu? This match will be abandoned and will not be recorded as a win.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Abandon",
          onPress: () => {
            buzz("error");
            onAbandon();
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        {/* Anti-cheat obscuring overlay */}
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Ionicons name="pause" size={28} color={Colors.accent} />
          </View>

          <Title size="lg">Game Paused</Title>
          <Text style={styles.subtitle}>{modeTitle}</Text>

          {/* Quick Settings Card */}
          <Card variant="default" style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons
                  name={settings.soundEnabled ? "volume-high" : "volume-mute"}
                  size={18}
                  color={Colors.textMuted}
                />
                <Text style={styles.settingText}>Sound Effects</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={(val) => {
                  buzz("light");
                  updateSettings({ soundEnabled: val });
                }}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.text}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={18}
                  color={Colors.textMuted}
                />
                <Text style={styles.settingText}>Haptic Feedback</Text>
              </View>
              <Switch
                value={settings.haptics}
                onValueChange={(val) => {
                  buzz("light");
                  updateSettings({ haptics: val });
                }}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.text}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingLabelWrap}>
                <Ionicons name="flame" size={18} color={Colors.textMuted} />
                <Text style={styles.settingText}>Hot & Cold Proximity</Text>
              </View>
              <Switch
                value={settings.showProximity}
                onValueChange={(val) => {
                  buzz("light");
                  updateSettings({ showProximity: val });
                }}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.text}
              />
            </View>
          </Card>

          {/* Action CTAs */}
          <View style={styles.buttonGroup}>
            <PrimaryButton
              variant="accent"
              size="lg"
              onPress={onResume}
              icon={<Ionicons name="play" size={18} color={Colors.bg} />}
            >
              Resume Match
            </PrimaryButton>

            <PrimaryButton
              variant="secondary"
              size="md"
              onPress={confirmRestart}
              icon={<Ionicons name="refresh" size={18} color={Colors.text} />}
            >
              Restart Match
            </PrimaryButton>

            <PrimaryButton
              variant="secondary"
              size="sm"
              onPress={confirmAbandon}
              icon={<Ionicons name="exit-outline" size={18} color={Colors.coral} />}
              style={{ borderColor: Colors.coral + "50" }}
            >
              Abandon & Return Home
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
    backgroundColor: "rgba(10, 14, 26, 0.95)", // High opacity prevents inspecting board while paused
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  settingsCard: {
    width: "100%",
    padding: 12,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  settingLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingText: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.text,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  buttonGroup: {
    width: "100%",
    gap: 10,
  },
});

