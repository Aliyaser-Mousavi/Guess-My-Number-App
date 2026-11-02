import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import {
  SmartHintService,
  type SmartHintOption,
} from "@/services/hint/SmartHintService";
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
  hintsRemaining: number;
  secret: number;
  low: number;
  high: number;
  onUseHint: (clue: string) => void;
  onClose: () => void;
};

export default function SmartHintModal({
  visible,
  hintsRemaining,
  secret,
  low,
  high,
  onUseHint,
  onClose,
}: Props) {
  const [selectedClue, setSelectedClue] = useState<string | null>(null);

  const availableHints = SmartHintService.getAvailableHints(secret, low, high);

  function handleSelect(hint: SmartHintOption) {
    setSelectedClue(hint.clue);
    onUseHint(hint.clue);
  }

  function handleDismiss() {
    setSelectedClue(null);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.badgeWrap}>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
              <Text style={styles.badgeText}>ORACLE HINTS</Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <Title size="md">Consult the Oracle</Title>
          <Text style={styles.counterText}>
            {hintsRemaining > 0
              ? `${hintsRemaining} hint${hintsRemaining === 1 ? "" : "s"} remaining this match`
              : "No hints remaining"}
          </Text>

          {/* Active Clue Revealed */}
          {selectedClue ? (
            <Card variant="accent" style={styles.revealedCard}>
              <View style={styles.revealedHeader}>
                <Ionicons name="bulb" size={20} color={Colors.accent} />
                <Text style={styles.revealedTitle}>ORACLE REVELATION</Text>
              </View>
              <Text style={styles.revealedClue}>{selectedClue}</Text>
              <PrimaryButton
                variant="accent"
                size="md"
                onPress={handleDismiss}
                style={{ marginTop: 14 }}
              >
                Got It
              </PrimaryButton>
            </Card>
          ) : (
            <ScrollView
              style={styles.optionsList}
              contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {availableHints.map((hint, idx) => {
                const disabled = hintsRemaining <= 0;
                return (
                  <Pressable
                    key={idx}
                    disabled={disabled}
                    onPress={() => handleSelect(hint)}
                    style={({ pressed }) => [
                      styles.hintItem,
                      disabled && styles.hintItemDisabled,
                      pressed && !disabled && styles.hintItemPressed,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons
                        name={hint.icon as any}
                        size={18}
                        color={disabled ? Colors.textDim : Colors.accent}
                      />
                    </View>
                    <View style={styles.itemTextCol}>
                      <Text
                        style={[
                          styles.itemTitle,
                          disabled && { color: Colors.textDim },
                        ]}
                      >
                        {hint.title}
                      </Text>
                      <Text style={styles.itemDesc} numberOfLines={2}>
                        {hint.description}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={disabled ? Colors.border : Colors.textDim}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {!selectedClue && (
            <PrimaryButton
              variant="secondary"
              size="md"
              onPress={handleDismiss}
              style={{ marginTop: 8 }}
            >
              Close
            </PrimaryButton>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 14, 26, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 184, 0, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  optionsList: {
    maxHeight: 280,
    marginVertical: 6,
  },
  hintItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  hintItemDisabled: {
    opacity: 0.4,
  },
  hintItemPressed: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.text,
    fontSize: 13,
    marginBottom: 2,
  },
  itemDesc: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  revealedCard: {
    padding: 16,
    marginVertical: 12,
  },
  revealedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  revealedTitle: {
    fontFamily: FontFamily.bodyBold,
    color: Colors.accent,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  revealedClue: {
    fontFamily: FontFamily.bodyMedium,
    color: Colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});

