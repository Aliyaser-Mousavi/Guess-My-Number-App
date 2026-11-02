import InteractiveTutorialModal from "@/components/tutorial/InteractiveTutorialModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import ScreenBackground from "@/components/ui/ScreenBackground";
import Title from "@/components/ui/Title";
import Colors from "@/constants/colors";
import { FontFamily, Radius } from "@/constants/theme";
import { useAppAlert } from "@/context/AlertProvider";
import { useGame } from "@/context/GameProvider";
import { LocalizationService } from "@/services/localization/LocalizationService";
import { NotificationService } from "@/services/notifications/NotificationService";
import { THEME_CATALOG, ThemeService } from "@/services/theme/ThemeService";
import type {
  ColorBlindOption,
  DigitFormatOption,
  HapticIntensity,
  LanguageOption,
  NumberAnimationOption,
  NumberDisplayStyle,
  TextSizeOption,
} from "@/types/game";
import { Ionicons } from "@expo/vector-icons";
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

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const {
    settings,
    updateSettings,
    resetStats,
    progression,
    competitiveRank,
    buzz,
    playSound,
    t,
    isRTL,
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
        { text: t("cancel"), style: "cancel" },
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

  async function handleToggleNotification(key: keyof typeof settings.notifications, val: boolean) {
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
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
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
              <Ionicons
                name={LocalizationService.getArrowBack(settings.language)}
                size={20}
                color={Colors.text}
              />
            </Pressable>
            <View style={styles.titleWrap}>
              <Title size="lg">{t("settings")}</Title>
            </View>
            <View style={{ width: 42 }} />
          </View>

          {/* 1. Themes & Appearance */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("themes_title").toUpperCase()}
          </Text>
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
                  style={[
                    styles.themeCard,
                    { borderColor: isSelected ? theme.colors.accent : Colors.border },
                    !unlocked && styles.themeCardLocked,
                  ]}
                >
                  {/* Theme Gradient Preview Swatch */}
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: theme.colors.bgElevated, borderColor: theme.colors.primary },
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
                    <Text style={styles.themeName}>{theme.name}</Text>
                    <Text style={styles.themeTagline} numberOfLines={1}>
                      {unlocked
                        ? isSelected
                          ? t("active_theme")
                          : theme.tagline
                        : theme.requiredLevel
                        ? `Unlocks at Lv. ${formatNumber(theme.requiredLevel)}`
                        : "Unlocked in higher rank"}
                    </Text>
                  </View>

                  {isSelected && (
                    <View style={styles.equippedCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={theme.colors.accent}
                      />
                    </View>
                  )}
                  {!unlocked && (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={14} color={Colors.textMuted} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* 2. Number Appearance & Animations */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("number_styles_title").toUpperCase()}
          </Text>
          <View style={styles.sectionGroup}>
            <View style={styles.optionList}>
              {[
                { id: "arcade_glow", label: t("style_arcade_glow") },
                { id: "holographic_glass", label: t("style_holographic_glass") },
                { id: "retro_pixel", label: t("style_retro_pixel") },
                { id: "minimal_clean", label: t("style_minimal_clean") },
                { id: "cyber_matrix", label: t("style_cyber_matrix") },
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
                    style={[
                      styles.choiceRow,
                      isSelected && styles.choiceRowSelected,
                      isRTL && styles.rowReverse,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceLabel,
                        isSelected && { color: Colors.accent },
                      ]}
                    >
                      {styleOpt.label}
                    </Text>
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isSelected ? Colors.accent : Colors.textDim}
                    />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.subDivider} />
            <Text style={[styles.subOptionLabel, isRTL && styles.textRight]}>
              {t("number_animations_title").toUpperCase()}
            </Text>
            <View style={styles.pillsRow}>
              {[
                { id: "pulse", label: "Pulse" },
                { id: "flicker", label: "Flicker" },
                { id: "bounce", label: "Bounce" },
                { id: "none", label: "None" },
              ].map((anim) => {
                const isSelected = settings.numberAnimation === anim.id;
                return (
                  <Pressable
                    key={anim.id}
                    onPress={() => {
                      buzz("light");
                      updateSettings({
                        numberAnimation: anim.id as NumberAnimationOption,
                      });
                    }}
                    style={[
                      styles.intensityPill,
                      isSelected && styles.intensityPillActive,
                    ]}
                  >
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

          {/* 3. Language & Format */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("language_title").toUpperCase()}
          </Text>
          <View style={styles.sectionGroup}>
            <View
              style={[
                styles.settingRow,
                isRTL && styles.rowReverse,
              ]}
            >
              <View style={[styles.settingRowLeft, isRTL && styles.rowReverse]}>
                <Ionicons name="globe-outline" size={20} color={Colors.primary} />
                <View>
                  <Text style={styles.rowTitle}>{t("language_label")}</Text>
                  <Text style={styles.rowSub}>English or فارسی (Full RTL)</Text>
                </View>
              </View>
              <View style={styles.pillsRow}>
                {[
                  { id: "en", label: "EN" },
                  { id: "fa", label: "فارسی" },
                ].map((lang) => {
                  const isSelected = settings.language === lang.id;
                  return (
                    <Pressable
                      key={lang.id}
                      onPress={() => {
                        buzz("light");
                        playSound("button_click");
                        updateSettings({ language: lang.id as LanguageOption });
                      }}
                      style={[
                        styles.intensityPill,
                        isSelected && styles.intensityPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityPillText,
                          isSelected && styles.intensityPillTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.subDivider} />

            <View
              style={[
                styles.settingRow,
                isRTL && styles.rowReverse,
              ]}
            >
              <View style={[styles.settingRowLeft, isRTL && styles.rowReverse]}>
                <Ionicons name="keypad-outline" size={20} color={Colors.accent} />
                <View>
                  <Text style={styles.rowTitle}>{t("digits_label")}</Text>
                  <Text style={styles.rowSub}>1 2 3 vs ۱ ۲ ۳</Text>
                </View>
              </View>
              <View style={styles.pillsRow}>
                {[
                  { id: "latin", label: "123" },
                  { id: "persian", label: "۱۲۳" },
                ].map((dig) => {
                  const isSelected = settings.digitFormat === dig.id;
                  return (
                    <Pressable
                      key={dig.id}
                      onPress={() => {
                        buzz("light");
                        updateSettings({ digitFormat: dig.id as DigitFormatOption });
                      }}
                      style={[
                        styles.intensityPill,
                        isSelected && styles.intensityPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityPillText,
                          isSelected && styles.intensityPillTextActive,
                        ]}
                      >
                        {dig.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* 4. Accessibility Options */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("accessibility_title").toUpperCase()}
          </Text>
          <View style={styles.sectionGroup}>
            {/* Text Scaling */}
            <View style={styles.accessibilitySubBlock}>
              <Text style={[styles.subOptionLabel, isRTL && styles.textRight]}>
                {t("text_size").toUpperCase()}
              </Text>
              <View style={styles.pillsRow}>
                {[
                  { id: "normal", label: "Normal" },
                  { id: "large", label: "Large" },
                  { id: "extraLarge", label: "XL" },
                ].map((sz) => {
                  const isSelected = settings.textSize === sz.id;
                  return (
                    <Pressable
                      key={sz.id}
                      onPress={() => {
                        buzz("light");
                        updateSettings({ textSize: sz.id as TextSizeOption });
                      }}
                      style={[
                        styles.intensityPill,
                        isSelected && styles.intensityPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.intensityPillText,
                          isSelected && styles.intensityPillTextActive,
                        ]}
                      >
                        {sz.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ToggleRow
              icon="contrast-outline"
              label={t("high_contrast")}
              description={t("high_contrast_desc")}
              value={settings.highContrast}
              isRTL={isRTL}
              onChange={(v) => {
                buzz("medium");
                updateSettings({ highContrast: v });
              }}
            />

            <ToggleRow
              icon="sparkles-outline"
              label={t("reduced_motion")}
              description={t("reduced_motion_desc")}
              value={settings.reducedMotion}
              isRTL={isRTL}
              onChange={(v) => {
                buzz("light");
                updateSettings({ reducedMotion: v });
              }}
            />

            <ToggleRow
              icon="hand-left-outline"
              label={t("left_handed")}
              description={t("left_handed_desc")}
              value={settings.leftHandedControls}
              isRTL={isRTL}
              onChange={(v) => {
                buzz("light");
                updateSettings({ leftHandedControls: v });
              }}
            />

            <View style={styles.subDivider} />
            <Text style={[styles.subOptionLabel, isRTL && styles.textRight]}>
              {t("color_blind").toUpperCase()}
            </Text>
            <View style={styles.optionList}>
              {[
                { id: "none", label: t("cb_none") },
                { id: "protanopia", label: t("cb_protanopia") },
                { id: "deuteranopia", label: t("cb_deuteranopia") },
                { id: "tritanopia", label: t("cb_tritanopia") },
              ].map((cb) => {
                const isSelected = settings.colorBlindMode === cb.id;
                return (
                  <Pressable
                    key={cb.id}
                    onPress={() => {
                      buzz("light");
                      updateSettings({
                        colorBlindMode: cb.id as ColorBlindOption,
                      });
                    }}
                    style={[
                      styles.choiceRow,
                      isSelected && styles.choiceRowSelected,
                      isRTL && styles.rowReverse,
                    ]}
                  >
                    <Text
                      style={[
                        styles.choiceLabel,
                        isSelected && { color: Colors.accent },
                      ]}
                    >
                      {cb.label}
                    </Text>
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isSelected ? Colors.accent : Colors.textDim}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 5. Notification Reminders */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("notifications_title").toUpperCase()}
          </Text>
          <View style={styles.sectionGroup}>
            <ToggleRow
              icon="calendar-outline"
              label={t("daily_reminder")}
              description={t("daily_reminder_desc")}
              value={settings.notifications.dailyReminder}
              isRTL={isRTL}
              onChange={(v) => handleToggleNotification("dailyReminder", v)}
            />
            <ToggleRow
              icon="flame-outline"
              label={t("streak_reminder")}
              description={t("streak_reminder_desc")}
              value={settings.notifications.streakReminder}
              isRTL={isRTL}
              onChange={(v) => handleToggleNotification("streakReminder", v)}
            />
            <ToggleRow
              icon="alarm-outline"
              label={t("mission_reminder")}
              description={t("mission_reminder_desc")}
              value={settings.notifications.missionReminder}
              isRTL={isRTL}
              onChange={(v) => handleToggleNotification("missionReminder", v)}
            />
            <ToggleRow
              icon="megaphone-outline"
              label={t("event_reminder")}
              description={t("event_reminder_desc")}
              value={settings.notifications.eventReminder}
              isRTL={isRTL}
              onChange={(v) => handleToggleNotification("eventReminder", v)}
            />

            <View style={styles.testNotifWrap}>
              <PrimaryButton
                variant="secondary"
                size="sm"
                onPress={handleSendTestNotification}
                icon={<Ionicons name="notifications-outline" size={16} color={Colors.text} />}
              >
                {t("send_test_notif")}
              </PrimaryButton>
              {testNotifStatus ? (
                <Text style={styles.testNotifText}>{testNotifStatus}</Text>
              ) : null}
            </View>
          </View>

          {/* 6. Audio & Sound Effects */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            {t("audio_haptics_title").toUpperCase()}
          </Text>
          <View style={styles.sectionGroup}>
            <ToggleRow
              icon="volume-high-outline"
              label={t("sound_effects")}
              description="Audio cues for guesses, triumphs, and interactions"
              value={settings.soundEnabled}
              isRTL={isRTL}
              onChange={(v) => {
                buzz("light");
                updateSettings({ soundEnabled: v });
                if (v) playSound("button_click");
              }}
            />

            {settings.soundEnabled && (
              <View style={styles.volumeRow}>
                <Text style={[styles.subOptionLabel, isRTL && styles.textRight]}>
                  {t("sound_volume").toUpperCase()}
                </Text>
                <View style={styles.pillsRow}>
                  {[
                    { label: "Quiet", val: 0.3 },
                    { label: "Balanced", val: 0.7 },
                    { label: "Full", val: 1.0 },
                  ].map((p) => {
                    const isSelected = Math.abs(settings.soundVolume - p.val) < 0.15;
                    return (
                      <Pressable
                        key={p.label}
                        onPress={() => {
                          buzz("light");
                          updateSettings({ soundVolume: p.val });
                          playSound("button_click");
                        }}
                        style={[
                          styles.intensityPill,
                          isSelected && styles.intensityPillActive,
                        ]}
                      >
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

            <ToggleRow
              icon="phone-portrait-outline"
              label={t("vibration_haptics")}
              description="Tactile pulses on buttons, range changes and alerts"
              value={settings.haptics}
              isRTL={isRTL}
              onChange={(v) => {
                updateSettings({ haptics: v });
                if (v) buzz("medium");
              }}
            />

            {settings.haptics && (
              <View style={styles.hapticOptionsCard}>
                <Text style={[styles.subOptionLabel, isRTL && styles.textRight]}>
                  {t("haptic_intensity").toUpperCase()}
                </Text>
                <View style={styles.pillsRow}>
                  {(["light", "medium", "heavy"] as HapticIntensity[]).map(
                    (level) => {
                      const isSelected = settings.hapticIntensity === level;
                      return (
                        <Pressable
                          key={level}
                          onPress={() => {
                            updateSettings({ hapticIntensity: level });
                            buzz(level === "heavy" ? "heavy" : level === "medium" ? "medium" : "light");
                          }}
                          style={[
                            styles.intensityPill,
                            isSelected && styles.intensityPillActive,
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

          {/* 7. Tutorial & Reset Data */}
          <Text style={[styles.sectionHeader, isRTL && styles.textRight]}>
            DATA & TUTORIAL
          </Text>
          <View style={styles.sectionGroup}>
            <Pressable
              onPress={() => {
                buzz("light");
                setShowTutorial(true);
              }}
              style={[styles.interactiveRow, isRTL && styles.rowReverse]}
            >
              <View style={[styles.interactiveLeft, isRTL && styles.rowReverse]}>
                <Ionicons name="sparkles" size={20} color={Colors.accent} />
                <View>
                  <Text style={styles.interactiveTitle}>Review Tutorial</Text>
                  <Text style={styles.interactiveSub}>
                    Walk through game rules & deduction strategy
                  </Text>
                </View>
              </View>
              <Ionicons
                name={LocalizationService.getChevronForward(settings.language)}
                size={18}
                color={Colors.textDim}
              />
            </Pressable>

            <View style={styles.dangerCard}>
              <View style={[styles.dangerLeft, isRTL && styles.rowReverse]}>
                <Ionicons name="warning" size={20} color={Colors.coral} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dangerTitle}>Erase Player Progress</Text>
                  <Text style={styles.dangerDesc}>
                    Clears all match records, win streaks, and earned badges
                  </Text>
                </View>
              </View>
              <PrimaryButton
                variant="danger"
                size="sm"
                onPress={confirmReset}
                icon={<Ionicons name="trash-outline" size={14} color="#FFF" />}
              >
                Reset
              </PrimaryButton>
            </View>
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
  isRTL = false,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  isRTL?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[styles.toggleRow, isRTL && styles.rowReverse]}>
      <View style={[styles.toggleLeft, isRTL && styles.rowReverse]}>
        <Ionicons name={icon} size={20} color={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, isRTL && styles.textRight]}>
            {label}
          </Text>
          <Text style={[styles.toggleDesc, isRTL && styles.textRight]}>
            {description}
          </Text>
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
  safe: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    opacity: 0.6,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  sectionHeader: {
    fontFamily: FontFamily.mono,
    color: Colors.textDim,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 10,
    paddingLeft: 2,
  },
  sectionGroup: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
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
  themeCardLocked: {
    opacity: 0.5,
  },
  themeSwatch: {
    width: 44,
    height: 44,
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
  themeName: {
    fontFamily: FontFamily.sansBold,
    fontSize: 14,
    color: Colors.text,
  },
  themeTagline: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  equippedCheck: {
    paddingRight: 4,
  },
  lockBadge: {
    paddingRight: 4,
  },
  optionList: {
    gap: 8,
  },
  choiceRow: {
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
  choiceRowSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.08)",
  },
  choiceLabel: {
    fontFamily: FontFamily.sansMedium,
    fontSize: 13,
    color: Colors.text,
  },
  subDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 4,
  },
  subOptionLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  settingRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.text,
  },
  rowSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  accessibilitySubBlock: {
    gap: 6,
  },
  testNotifWrap: {
    gap: 6,
    marginTop: 4,
  },
  testNotifText: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.mint,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
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
    marginTop: 1,
  },
  volumeRow: {
    gap: 6,
    paddingLeft: 30,
  },
  hapticOptionsCard: {
    gap: 8,
    paddingLeft: 30,
  },
  intensityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.xs,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intensityPillActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255, 184, 0, 0.15)",
  },
  intensityPillText: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  intensityPillTextActive: {
    color: Colors.accent,
  },
  interactiveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 184, 0, 0.08)",
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 184, 0, 0.25)",
  },
  interactiveLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  interactiveTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.accent,
  },
  interactiveSub: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  dangerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 71, 87, 0.08)",
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 71, 87, 0.25)",
    gap: 10,
  },
  dangerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dangerTitle: {
    fontFamily: FontFamily.sansBold,
    fontSize: 13,
    color: Colors.coral,
  },
  dangerDesc: {
    fontFamily: FontFamily.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
