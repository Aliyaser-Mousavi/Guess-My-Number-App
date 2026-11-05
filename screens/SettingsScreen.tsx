// ==============================================================================
// Screen: SettingsScreen.tsx
// Description: Modernized settings and configuration hub for MarsGuess.
//              Features sleek glassmorphism category cards, visual themes,
//              number styles, accessibility options, push notifications,
//              audio & haptic tuning, and a redesigned high-craft danger zone.
// ==============================================================================

import InteractiveTutorialModal from "@/components/tutorial/InteractiveTutorialModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { NotificationService } from "@/services/notifications/NotificationService";
import { THEME_CATALOG, ThemeService } from "@/services/theme/ThemeService";
import type {
  ColorBlindOption,
  HapticIntensity,
  NumberAnimationOption,
  NumberDisplayStyle,
  TextSizeOption,
} from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen({
  onBack,
  onOpenAboutDeveloper,
}: {
  onBack: () => void;
  onOpenAboutDeveloper?: () => void;
}) {
  const {
    settings,
    updateSettings,
    resetStats,
    progression,
    competitiveRank,
    buzz,
    playSound,
    formatNumber,
  } = useGame();
  const { showAlert } = useAppAlert();
  const [showTutorial, setShowTutorial] = useState(false);
  const [testNotifStatus, setTestNotifStatus] = useState<string | null>(null);

  function confirmReset() {
    buzz("error");
    playSound("guess_wrong");
    showAlert(
      "Reset All Progress?",
      "Lifetime statistics, win streaks, and earned badges will be permanently erased. This action cannot be reversed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: () => {
            resetStats();
            buzz("error");
          },
        },
      ],
    );
  }

  async function handleToggleNotification(
    key: keyof typeof settings.notifications,
    val: boolean,
  ) {
    buzz("light");
    if (val) {
      const granted = await NotificationService.requestPermissions();
      if (!granted) {
        showAlert(
          "Permission Required",
          "Please enable notification permissions in your device settings to receive challenge alerts.",
          [{ text: "OK" }],
        );
        return;
      }
    }

    const nextNotifs = {
      ...settings.notifications,
      [key]: val,
      permissionGranted: true,
    };
    updateSettings({ notifications: nextNotifs });
    await NotificationService.syncAllReminders(nextNotifs);
  }

  async function handleSendTestNotification() {
    buzz("light");
    playSound("button_click");
    const ok = await NotificationService.sendTestNotification();
    if (ok) {
      setTestNotifStatus("Test notification sent! Check your notification tray.");
    } else {
      setTestNotifStatus("Could not deliver notification. Check OS permissions.");
    }
    setTimeout(() => setTestNotifStatus(null), 4000);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Navigation Header */}
        <View style={styles.headerBar}>
          <Pressable
            onPress={() => {
              buzz("light");
              playSound("button_click");
              onBack();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Title size="md">Settings</Title>
            <Text style={styles.headerSubtitle}>System & Preferences</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Themes & Appearance */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="color-palette-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>VISUAL THEMES</Text>
                <Text style={styles.sectionSubtext}>
                  Select your tactical radar color palette
                </Text>
              </View>
            </View>

            <View style={styles.themesGrid}>
              {THEME_CATALOG.map((theme) => {
                const unlocked = ThemeService.isThemeUnlocked(
                  theme,
                  progression.level,
                  competitiveRank.tier,
                );
                const isSelected = settings.themeId === theme.id;

                return (
                  <Pressable
                    key={theme.id}
                    onPress={() => {
                      if (unlocked) {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({ themeId: theme.id });
                      } else {
                        buzz("error");
                      }
                    }}
                    style={({ pressed }) => [
                      styles.themeCard,
                      {
                        borderColor: isSelected
                          ? theme.colors.accent
                          : Colors.border,
                      },
                      isSelected && styles.themeCardSelected,
                      !unlocked && styles.themeCardLocked,
                      pressed && unlocked && styles.themeCardPressed,
                    ]}
                  >
                    {/* Theme Swatch */}
                    <View
                      style={[
                        styles.themeSwatch,
                        {
                          backgroundColor: theme.colors.bgElevated,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.themeSwatchDot,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatchDot,
                          { backgroundColor: theme.colors.accent },
                        ]}
                      />
                      <View
                        style={[
                          styles.themeSwatchDot,
                          { backgroundColor: theme.colors.coral },
                        ]}
                      />
                    </View>

                    <View style={styles.themeInfo}>
                      <View style={styles.themeTitleRow}>
                        <Text style={styles.themeName}>{theme.name}</Text>
                        {isSelected && (
                          <View
                            style={[
                              styles.themeStatusBadge,
                              { backgroundColor: `${theme.colors.accent}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.themeStatusBadgeText,
                                { color: theme.colors.accent },
                              ]}
                            >
                              EQUIPPED
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.themeTagline} numberOfLines={1}>
                        {unlocked
                          ? theme.tagline
                          : theme.requiredLevel
                          ? `Unlocks at Lv. ${formatNumber(theme.requiredLevel)}`
                          : "Unlocked in higher rank"}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={styles.themeCheckWrap}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.colors.accent}
                        />
                      </View>
                    )}
                    {!unlocked && (
                      <View style={styles.lockBadge}>
                        <Ionicons
                          name="lock-closed"
                          size={15}
                          color={Colors.textMuted}
                        />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section 2: Number Appearance & Animations */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="sparkles-outline" size={16} color={Colors.accent} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>NUMBER APPEARANCE</Text>
                <Text style={styles.sectionSubtext}>
                  Display styles and dynamic guessing animations
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subOptionHeader}>STYLE VARIANT</Text>
              <View style={styles.optionList}>
                {[
                  { id: "arcade_glow", label: "Arcade Glow", desc: "Cyan neon halo with neon vibrancy" },
                  { id: "holographic_glass", label: "Holographic Glass", desc: "Frosted translucent glass overlay" },
                  { id: "retro_pixel", label: "Retro Pixel", desc: "Classic 8-bit arcade aesthetic" },
                  { id: "minimal_clean", label: "Minimal Clean", desc: "Crisp typography with zero distractions" },
                  { id: "cyber_matrix", label: "Cyber Matrix", desc: "Tactical telemetry HUD phosphor" },
                ].map((styleOpt) => {
                  const isSelected = settings.numberStyle === styleOpt.id;
                  return (
                    <Pressable
                      key={styleOpt.id}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({
                          numberStyle: styleOpt.id as NumberDisplayStyle,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.choiceCard,
                        isSelected && styles.choiceCardSelected,
                        pressed && styles.choiceCardPressed,
                      ]}
                    >
                      <View style={styles.choiceLeft}>
                        <View
                          style={[
                            styles.choiceRadioOuter,
                            isSelected && styles.choiceRadioOuterActive,
                          ]}
                        >
                          {isSelected && <View style={styles.choiceRadioInner} />}
                        </View>
                        <View style={styles.choiceTextWrap}>
                          <Text
                            style={[
                              styles.choiceLabel,
                              isSelected && { color: Colors.accent },
                            ]}
                          >
                            {styleOpt.label}
                          </Text>
                          <Text style={styles.choiceDesc}>{styleOpt.desc}</Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={15}
                        color={isSelected ? Colors.accent : Colors.textDim}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.subDivider} />

              <Text style={styles.subOptionHeader}>NUMBER ANIMATION</Text>
              <View style={styles.pillsRow}>
                {[
                  { id: "pulse", label: "Pulse", icon: "pulse-outline" },
                  { id: "flicker", label: "Flicker", icon: "flash-outline" },
                  { id: "bounce", label: "Bounce", icon: "arrow-up-outline" },
                  { id: "none", label: "None", icon: "close-outline" },
                ].map((anim) => {
                  const isSelected = settings.numberAnimation === anim.id;
                  return (
                    <Pressable
                      key={anim.id}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({
                          numberAnimation: anim.id as NumberAnimationOption,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.intensityPill,
                        isSelected && styles.intensityPillActive,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons
                        name={anim.icon as any}
                        size={13}
                        color={isSelected ? Colors.accent : Colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.intensityPillText,
                          isSelected && styles.intensityPillTextActive,
                        ]}
                      >
                        {anim.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Section 3: Accessibility Options */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="accessibility-outline" size={16} color={Colors.mint} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>ACCESSIBILITY OPTIONS</Text>
                <Text style={styles.sectionSubtext}>
                  Visual, motion, and ergonomic assistance
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.subOptionHeader}>TEXT SCALING</Text>
              <View style={styles.pillsRow}>
                {[
                  { id: "normal", label: "Standard", sub: "100%" },
                  { id: "large", label: "Large", sub: "115%" },
                  { id: "extraLarge", label: "XL", sub: "130%" },
                ].map((sz) => {
                  const isSelected = settings.textSize === sz.id;
                  return (
                    <Pressable
                      key={sz.id}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({ textSize: sz.id as TextSizeOption });
                      }}
                      style={({ pressed }) => [
                        styles.intensityPill,
                        isSelected && styles.intensityPillActive,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityPillText,
                          isSelected && styles.intensityPillTextActive,
                        ]}
                      >
                        {sz.label} ({sz.sub})
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.subDivider} />

              <ToggleRow
                icon="contrast-outline"
                label="High Contrast Mode"
                description="Pure black backgrounds with maximum visibility borders"
                value={settings.highContrast}
                onChange={(v) => {
                  buzz("medium");
                  updateSettings({ highContrast: v });
                }}
              />

              <ToggleRow
                icon="speedometer-outline"
                label="Reduced Motion"
                description="Minimizes looping animations, scale springs, and particles"
                value={settings.reducedMotion}
                onChange={(v) => {
                  buzz("light");
                  updateSettings({ reducedMotion: v });
                }}
              />

              <ToggleRow
                icon="hand-left-outline"
                label="Left-Handed Layout"
                description="Reverses action button alignments for single-handed left-thumb play"
                value={settings.leftHandedControls}
                onChange={(v) => {
                  buzz("light");
                  updateSettings({ leftHandedControls: v });
                }}
              />

              <View style={styles.subDivider} />

              <Text style={styles.subOptionHeader}>COLOR-BLIND PROTOCOL</Text>
              <View style={styles.optionList}>
                {[
                  { id: "none", label: "Standard Colors", tag: "Default" },
                  { id: "protanopia", label: "Protanopia Friendly", tag: "Red-Weak" },
                  { id: "deuteranopia", label: "Deuteranopia Friendly", tag: "Green-Weak" },
                  { id: "tritanopia", label: "Tritanopia Friendly", tag: "Blue-Weak" },
                ].map((cb) => {
                  const isSelected = settings.colorBlindMode === cb.id;
                  return (
                    <Pressable
                      key={cb.id}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({
                          colorBlindMode: cb.id as ColorBlindOption,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.choiceCard,
                        isSelected && styles.choiceCardSelected,
                        pressed && styles.choiceCardPressed,
                      ]}
                    >
                      <View style={styles.choiceLeft}>
                        <View
                          style={[
                            styles.choiceRadioOuter,
                            isSelected && styles.choiceRadioOuterActive,
                          ]}
                        >
                          {isSelected && <View style={styles.choiceRadioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.choiceLabel,
                            isSelected && { color: Colors.accent },
                          ]}
                        >
                          {cb.label}
                        </Text>
                      </View>
                      <View style={styles.tagPill}>
                        <Text style={styles.tagPillText}>{cb.tag}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Section 4: Notification Reminders */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="notifications-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>NOTIFICATION REMINDERS</Text>
                <Text style={styles.sectionSubtext}>
                  Timed mission alerts and streak protection reminders
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <ToggleRow
                icon="calendar-outline"
                label="Daily Challenge Reminder"
                description="Alerts you when a new daily puzzle is available"
                value={settings.notifications.dailyReminder}
                onChange={(v) => handleToggleNotification("dailyReminder", v)}
              />
              <ToggleRow
                icon="flame-outline"
                label="Streak Protector"
                description="Warns you in the evening if your streak is in jeopardy"
                value={settings.notifications.streakReminder}
                onChange={(v) => handleToggleNotification("streakReminder", v)}
              />
              <ToggleRow
                icon="alarm-outline"
                label="Mission Expiration Alert"
                description="Reminds you before daily or weekly missions reset"
                value={settings.notifications.missionReminder}
                onChange={(v) => handleToggleNotification("missionReminder", v)}
              />
              <ToggleRow
                icon="megaphone-outline"
                label="Special Event Alerts"
                description="Notifies you of arcade events and bonus XP weekends"
                value={settings.notifications.eventReminder}
                onChange={(v) => handleToggleNotification("eventReminder", v)}
              />

              <View style={styles.subDivider} />

              <View style={styles.testNotifWrap}>
                <PrimaryButton
                  variant="secondary"
                  size="sm"
                  onPress={handleSendTestNotification}
                  icon={
                    <Ionicons
                      name="paper-plane-outline"
                      size={15}
                      color={Colors.text}
                    />
                  }
                >
                  Send Test Notification
                </PrimaryButton>
                {testNotifStatus ? (
                  <View style={styles.testNotifStatusBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.mint} />
                    <Text style={styles.testNotifText}>{testNotifStatus}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Section 5: Audio & Sound Effects */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="volume-high-outline" size={16} color={Colors.accent} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>AUDIO & HAPTICS</Text>
                <Text style={styles.sectionSubtext}>
                  Feedback volume and tactical vibration intensity
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <ToggleRow
                icon="musical-notes-outline"
                label="Sound Effects"
                description="Audio cues for guesses, triumphs, and button clicks"
                value={settings.soundEnabled}
                onChange={(v) => {
                  buzz("light");
                  updateSettings({ soundEnabled: v });
                  if (v) playSound("button_click");
                }}
              />

              {settings.soundEnabled && (
                <View style={styles.subSettingGroup}>
                  <Text style={styles.subOptionHeader}>SOUND VOLUME</Text>
                  <View style={styles.pillsRow}>
                    {[
                      { label: "Quiet", val: 0.3, icon: "volume-low" },
                      { label: "Balanced", val: 0.7, icon: "volume-medium" },
                      { label: "Full", val: 1.0, icon: "volume-high" },
                    ].map((p) => {
                      const isSelected =
                        Math.abs(settings.soundVolume - p.val) < 0.15;
                      return (
                        <Pressable
                          key={p.label}
                          onPress={() => {
                            buzz("light");
                            updateSettings({ soundVolume: p.val });
                            playSound("button_click");
                          }}
                          style={({ pressed }) => [
                            styles.intensityPill,
                            isSelected && styles.intensityPillActive,
                            pressed && styles.buttonPressed,
                          ]}
                        >
                          <Ionicons
                            name={p.icon as any}
                            size={13}
                            color={isSelected ? Colors.accent : Colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.intensityPillText,
                              isSelected && styles.intensityPillTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.subDivider} />

              <ToggleRow
                icon="phone-portrait-outline"
                label="Haptic Feedback"
                description="Tactile pulses on button presses, range updates, and errors"
                value={settings.haptics}
                onChange={(v) => {
                  updateSettings({ haptics: v });
                  if (v) buzz("medium");
                }}
              />

              {settings.haptics && (
                <View style={styles.subSettingGroup}>
                  <Text style={styles.subOptionHeader}>HAPTIC INTENSITY</Text>
                  <View style={styles.pillsRow}>
                    {(["light", "medium", "heavy"] as HapticIntensity[]).map(
                      (level) => {
                        const isSelected = settings.hapticIntensity === level;
                        return (
                          <Pressable
                            key={level}
                            onPress={() => {
                              updateSettings({ hapticIntensity: level });
                              buzz(
                                level === "heavy"
                                  ? "heavy"
                                  : level === "medium"
                                  ? "medium"
                                  : "light",
                              );
                            }}
                            style={({ pressed }) => [
                              styles.intensityPill,
                              isSelected && styles.intensityPillActive,
                              pressed && styles.buttonPressed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.intensityPillText,
                                isSelected && styles.intensityPillTextActive,
                              ]}
                            >
                              {level.toUpperCase()}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Section 6: Data & Support */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconPill}>
                <Ionicons name="cube-outline" size={16} color={Colors.primary} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.sectionHeading}>DATA & RESOURCES</Text>
                <Text style={styles.sectionSubtext}>
                  Tutorial guide, developer spotlight, and data storage
                </Text>
              </View>
            </View>

            <View style={styles.sectionCard}>
              {onOpenAboutDeveloper && (
                <Pressable
                  onPress={() => {
                    buzz("light");
                    playSound("button_click");
                    onOpenAboutDeveloper();
                  }}
                  style={({ pressed }) => [
                    styles.navLinkCard,
                    pressed && styles.choiceCardPressed,
                  ]}
                >
                  <View style={styles.navLinkLeft}>
                    <View style={styles.navLinkIconPill}>
                      <Ionicons
                        name="person-circle-outline"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.navLinkTitle}>About Developer</Text>
                      <Text style={styles.navLinkSub}>
                        Aliyaser Mousavi • Creator
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.textDim}
                  />
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  buzz("light");
                  setShowTutorial(true);
                }}
                style={({ pressed }) => [
                  styles.navLinkCard,
                  pressed && styles.choiceCardPressed,
                ]}
              >
                <View style={styles.navLinkLeft}>
                  <View
                    style={[
                      styles.navLinkIconPill,
                      {
                        backgroundColor: "rgba(255, 184, 0, 0.12)",
                        borderColor: "rgba(255, 184, 0, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="sparkles" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.navLinkTitle, { color: Colors.accent }]}>
                      Review Interactive Tutorial
                    </Text>
                    <Text style={styles.navLinkSub}>
                      Walk through game deduction strategy and rules
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={Colors.textDim}
                />
              </Pressable>
            </View>
          </View>

          {/* Section 7: Redesigned High-Craft Danger Zone */}
          <View style={styles.dangerZoneContainer}>
            <LinearGradient
              colors={["rgba(255, 71, 87, 0.12)", "rgba(10, 14, 23, 0.95)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dangerGradientBg}
            />

            <View style={styles.dangerHeaderRow}>
              <View style={styles.dangerIconBadge}>
                <Ionicons name="warning" size={18} color={Colors.coral} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.dangerSectionTitle}>TACTICAL RESET ZONE</Text>
                <Text style={styles.dangerSectionSubtitle}>
                  Permanent data clearance protocol
                </Text>
              </View>
            </View>

            <View style={styles.dangerInfoBox}>
              <Text style={styles.dangerInfoText}>
                Erasing player data will permanently delete your lifetime statistics,
                win streaks, earned cosmetic trophies, and match history. This action
                is immediate and cannot be recovered.
              </Text>
            </View>

            <PrimaryButton
              variant="danger"
              size="md"
              onPress={confirmReset}
              style={styles.dangerResetButton}
              icon={<Ionicons name="trash-outline" size={17} color={Colors.white} />}
            >
              ERASE ALL PLAYER PROGRESS
            </PrimaryButton>
          </View>
        </ScrollView>

        <InteractiveTutorialModal
          visible={showTutorial}
          onClose={() => setShowTutorial(false)}
          onFinish={() => setShowTutorial(false)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <View style={styles.toggleIconWrap}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
        <View style={styles.flex1}>
          <Text style={styles.toggleTitle}>{label}</Text>
          <Text style={styles.toggleDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.bgElevated, true: Colors.primary }}
        thumbColor={value ? Colors.white : Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitleWrap: {
    alignItems: "center",
  },
  headerSubtitle: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.hero,
    gap: Spacing.lg,
  },

  /* Section Containers */
  sectionContainer: {
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 2,
  },
  sectionIconPill: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  sectionHeading: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.text,
    letterSpacing: 1.2,
  },
  sectionSubtext: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    ...Shadows.sm,
  },

  /* Visual Themes Grid */
  themesGrid: {
    gap: 10,
  },
  themeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  themeCardSelected: {
    backgroundColor: Colors.bgElevated,
    ...Shadows.glowGold,
  },
  themeCardLocked: {
    opacity: 0.55,
  },
  themeCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  themeSwatch: {
    width: 46,
    height: 46,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  themeSwatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  themeStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  themeStatusBadgeText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  themeTagline: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  themeCheckWrap: {
    paddingRight: 4,
  },
  lockBadge: {
    paddingRight: 4,
  },

  /* Sub Option Headers */
  subOptionHeader: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  subDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 2,
  },

  /* Choice Cards (Radio List) */
  optionList: {
    gap: 8,
  },
  choiceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choiceCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  choiceCardPressed: {
    opacity: 0.8,
  },
  choiceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  choiceRadioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceRadioOuterActive: {
    borderColor: Colors.accent,
  },
  choiceRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceLabel: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  choiceDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 10.5,
    color: Colors.textDim,
    marginTop: 1,
  },
  tagPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
  },

  /* Pills Row */
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intensityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intensityPillActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.14)",
  },
  intensityPillText: {
    fontFamily: FontFamily.monoBold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  intensityPillTextActive: {
    color: Colors.accent,
  },

  /* Toggle Row */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  toggleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  toggleTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  toggleDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  subSettingGroup: {
    paddingLeft: 44,
    gap: 8,
  },

  /* Test Notification Wrap */
  testNotifWrap: {
    gap: 8,
  },
  testNotifStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(61, 220, 151, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: "rgba(61, 220, 151, 0.25)",
  },
  testNotifText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.mint,
  },

  /* Nav Links in Data Section */
  navLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  navLinkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  navLinkIconPill: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderAccent,
  },
  navLinkTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  navLinkSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  /* Redesigned Danger Zone */
  dangerZoneContainer: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.35)",
    overflow: "hidden",
    position: "relative",
    gap: Spacing.md,
  },
  dangerGradientBg: {
    ...StyleSheet.absoluteFill,
  },
  dangerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dangerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: "rgba(255, 71, 87, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.35)",
  },
  dangerSectionTitle: {
    fontFamily: FontFamily.monoBold,
    fontSize: 12,
    color: Colors.coral,
    letterSpacing: 1.2,
  },
  dangerSectionSubtitle: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
  dangerInfoBox: {
    backgroundColor: "rgba(255, 71, 87, 0.08)",
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.2)",
  },
  dangerInfoText: {
    fontFamily: FontFamily.sans,
    fontSize: 11.5,
    lineHeight: 18,
    color: Colors.textMuted,
  },
  dangerResetButton: {
    width: "100%",
  },
});
