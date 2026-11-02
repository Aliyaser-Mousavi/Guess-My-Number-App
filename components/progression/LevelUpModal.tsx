import ConfettiBurst from "@/components/ui/ConfettiBurst";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { ProgressionService } from "@/services/progression/ProgressionService";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  level: number;
  levelsGained: number;
  onClose: () => void;
};

export default function LevelUpModal({
  visible,
  level,
  levelsGained,
  onClose,
}: Props) {
  if (!visible) return null;

  const title = ProgressionService.getRankTitle(level);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ConfettiBurst active={visible} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalBox}>
            {/* Top Sparkle Banner */}
            <View style={styles.badgeRow}>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
              <Text style={styles.badgeText}>LEVEL UP ACHIEVED!</Text>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
            </View>

            {/* Level Orb Centerpiece */}
            <View style={styles.orbWrap}>
              <View style={styles.orbOuterRing} />
              <View style={styles.orbInner}>
                <Text style={styles.orbSub}>LEVEL</Text>
                <Text style={styles.orbNumber}>{level}</Text>
              </View>
            </View>

            {/* Praise & Prestige Title */}
            <Text style={styles.congratsTitle}>
              {levelsGained > 1
                ? `Leaped ${levelsGained} Levels!`
                : "New Level Unlocked!"}
            </Text>

            <View style={styles.titlePill}>
              <Ionicons name="ribbon" size={14} color={Colors.accent} />
              <Text style={styles.titlePillText}>{title}</Text>
            </View>

            <Text style={styles.descText}>
              Your deduction precision continues to sharpen. New rewards, badges,
              and arcade prestige are now available in your Locker.
            </Text>

            {/* Action CTA */}
            <View style={styles.btnWrap}>
              <PrimaryButton
                variant="accent"
                size="lg"
                onPress={onClose}
                icon={<Ionicons name="arrow-forward" size={18} color={Colors.bg} />}
              >
                Claim & Continue
              </PrimaryButton>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  safe: {
    width: "100%",
    maxWidth: 380,
  },
  modalBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  badgeText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.accent,
    letterSpacing: 2,
    fontWeight: "700",
  },
  orbWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginVertical: 10,
  },
  orbOuterRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "rgba(255, 184, 0, 0.3)",
  },
  orbInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  orbSub: {
    fontFamily: FontFamily.mono,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  orbNumber: {
    fontFamily: FontFamily.display,
    fontSize: 42,
    color: Colors.accent,
    lineHeight: 46,
  },
  congratsTitle: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    color: Colors.text,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  titlePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.2)",
    marginBottom: 12,
  },
  titlePillText: {
    fontFamily: FontFamily.sansBold,
    fontSize: 12,
    color: Colors.accent,
  },
  descText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  btnWrap: {
    width: "100%",
  },
});

