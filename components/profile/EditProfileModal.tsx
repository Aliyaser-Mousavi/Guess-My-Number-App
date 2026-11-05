import PlayerAvatar, {
  AVATAR_CATALOG,
  type AvatarMetadata,
} from "@/components/profile/PlayerAvatar";
import PrimaryButton from "@/components/ui/PrimaryButton";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useGame } from "@/context/GameProvider";
import { EXPANDED_ACHIEVEMENTS } from "@/services/achievements/AchievementService";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function EditProfileModal({ visible, onClose }: Props) {
  const {
    profile,
    updateProfile,
    progression,
    stats,
    cosmetics,
    buzz,
    playSound,
  } = useGame();

  const [name, setName] = useState(profile.displayName);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarId);
  const [selectedShowcase, setSelectedShowcase] = useState<string[]>(
    profile.showcaseAchievements ?? [],
  );
  const [errorMsg, setErrorMsg] = useState("");

  if (!visible) return null;

  function isAvatarUnlocked(avatar: AvatarMetadata): boolean {
    if (avatar.isDefault) return true;
    if (cosmetics.unlockedAvatars.includes(avatar.id)) return true;
    if (avatar.requiredLevel && progression.level >= avatar.requiredLevel) {
      return true;
    }
    if (avatar.requiredAchievement && stats.unlockedAchievements.includes(avatar.requiredAchievement)) {
      return true;
    }
    return false;
  }

  function toggleShowcase(achId: string) {
    buzz("light");
    if (selectedShowcase.includes(achId)) {
      setSelectedShowcase(selectedShowcase.filter((id) => id !== achId));
    } else {
      if (selectedShowcase.length >= 3) {
        // limit to 3 showcase badges
        buzz("error");
        return;
      }
      setSelectedShowcase([...selectedShowcase, achId]);
    }
  }

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrorMsg("Display name must be at least 2 characters.");
      buzz("error");
      return;
    }
    if (trimmed.length > 20) {
      setErrorMsg("Display name cannot exceed 20 characters.");
      buzz("error");
      return;
    }

    updateProfile({
      displayName: trimmed,
      avatarId: selectedAvatar,
      showcaseAchievements: selectedShowcase,
    });
    buzz("success");
    playSound("button_click");
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Profile</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Display Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                  placeholder="Enter your display name"
                  placeholderTextColor={Colors.textDim}
                  style={styles.textInput}
                  maxLength={20}
                  autoCorrect={false}
                />
                {errorMsg ? (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                ) : null}
              </View>

              {/* Avatar Selection Grid */}
              <View style={styles.sectionWrap}>
                <Text style={styles.label}>Choose Your Avatar</Text>
                <View style={styles.avatarGrid}>
                  {AVATAR_CATALOG.map((avatar) => {
                    const unlocked = isAvatarUnlocked(avatar);
                    const selected = selectedAvatar === avatar.id;

                    return (
                      <Pressable
                        key={avatar.id}
                        onPress={() => {
                          if (unlocked) {
                            buzz("light");
                            setSelectedAvatar(avatar.id);
                          } else {
                            buzz("error");
                          }
                        }}
                        style={[
                          styles.avatarOption,
                          selected && styles.avatarOptionSelected,
                          !unlocked && styles.avatarOptionLocked,
                        ]}
                      >
                        <PlayerAvatar
                          avatarId={avatar.id}
                          size={46}
                          showGlow={selected}
                        />
                        {!unlocked && (
                          <View style={styles.lockOverlay}>
                            <Ionicons
                              name="lock-closed"
                              size={14}
                              color={Colors.textMuted}
                            />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Showcase Badges Selection */}
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.label}>Showcase Badges</Text>
                  <Text style={styles.counterText}>
                    {selectedShowcase.length} / 3 Selected
                  </Text>
                </View>
                <Text style={styles.helperText}>
                  Choose up to 3 unlocked badges to showcase on your profile.
                </Text>

                <View style={styles.badgeList}>
                  {stats.unlockedAchievements.length === 0 ? (
                    <Text style={styles.emptyText}>
                      No badges unlocked yet. Win games to earn badges!
                    </Text>
                  ) : (
                    stats.unlockedAchievements.map((achId) => {
                      const ach = EXPANDED_ACHIEVEMENTS.find(
                        (a) => a.id === achId,
                      );
                      if (!ach) return null;
                      const isShowcased = selectedShowcase.includes(achId);

                      return (
                        <Pressable
                          key={achId}
                          onPress={() => toggleShowcase(achId)}
                          style={[
                            styles.badgeRow,
                            isShowcased && styles.badgeRowSelected,
                          ]}
                        >
                          <View
                            style={[
                              styles.badgeIconWrap,
                              isShowcased && {
                                backgroundColor: "rgba(255, 184, 0, 0.2)",
                              },
                            ]}
                          >
                            <Ionicons
                              name={(ach.icon as any) ?? "ribbon"}
                              size={16}
                              color={isShowcased ? Colors.accent : Colors.textMuted}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.badgeTitle,
                                isShowcased && { color: Colors.accent },
                              ]}
                            >
                              {ach.title}
                            </Text>
                            <Text style={styles.badgeDesc} numberOfLines={1}>
                              {ach.description}
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              isShowcased
                                ? "checkmark-circle"
                                : "ellipse-outline"
                            }
                            size={18}
                            color={isShowcased ? Colors.accent : Colors.textDim}
                          />
                        </Pressable>
                      );
                    })
                  )}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    variant="secondary"
                    size="md"
                    onPress={onClose}
                  >
                    Cancel
                  </PrimaryButton>
                </View>
                <View style={{ flex: 1 }}>
                  <PrimaryButton
                    variant="accent"
                    size="md"
                    onPress={handleSave}
                  >
                    Save Profile
                  </PrimaryButton>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  safe: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontFamily: FontFamily.display,
    fontSize: 18,
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  textInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: FontFamily.sansMedium,
    fontSize: 15,
  },
  errorText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.coral,
    marginTop: 2,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.accent,
  },
  helperText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  avatarOption: {
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  avatarOptionLocked: {
    opacity: 0.45,
  },
  lockOverlay: {
    position: "absolute",
    right: 2,
    bottom: 2,
    backgroundColor: Colors.bg,
    borderRadius: Radius.full,
    padding: 2,
  },
  badgeList: {
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgElevated,
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeRowSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  badgeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  badgeDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  emptyText: {
    fontFamily: FontFamily.sans,
    fontSize: 12,
    color: Colors.textDim,
    fontStyle: "italic",
    paddingVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    paddingBottom: 16,
  },
});
