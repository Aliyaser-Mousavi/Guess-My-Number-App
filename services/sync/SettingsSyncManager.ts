import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageKeys } from "../storage/StorageKeys";
import type { Settings } from "@/types/game";

export type DirtySettingsMap = Partial<Record<keyof Settings, any>>;

export class SettingsSyncManager {
  /**
   * Generates the AsyncStorage key scoped to a specific user (or guest).
   */
  static getStorageKey(userId?: string | null): string {
    const scope = userId && userId.trim().length > 0 ? userId.trim() : "guest";
    return `${StorageKeys.DIRTY_SETTINGS_PREFIX}${scope}`;
  }

  /**
   * Retrieves currently recorded dirty fields for the given user scope.
   */
  static async getDirtyFields(userId?: string | null): Promise<DirtySettingsMap> {
    try {
      const key = this.getStorageKey(userId);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return {};
      return parsed;
    } catch {
      return {};
    }
  }

  /**
   * Marks individual setting fields as dirty (explicitly modified by user).
   */
  static async markDirty(
    patch: Partial<Settings>,
    userId?: string | null,
  ): Promise<void> {
    try {
      if (!patch || Object.keys(patch).length === 0) return;
      const key = this.getStorageKey(userId);
      const current = await this.getDirtyFields(userId);
      const updated: DirtySettingsMap = { ...current };

      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) {
          (updated as any)[k] = v;
        }
      }

      await AsyncStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.warn("[SettingsSyncManager] markDirty failed:", e);
    }
  }

  /**
   * Clears acknowledged dirty fields only if their current values match what was uploaded.
   * If a field was modified again while upload was in flight, it remains dirty.
   */
  static async clearAcknowledgedDirty(
    acknowledgedPatch: Partial<Settings>,
    userId?: string | null,
  ): Promise<void> {
    try {
      if (!acknowledgedPatch || Object.keys(acknowledgedPatch).length === 0) return;
      const key = this.getStorageKey(userId);
      const current = await this.getDirtyFields(userId);
      let changed = false;

      for (const [k, inFlightVal] of Object.entries(acknowledgedPatch)) {
        if (!(k in current)) continue;
        const currentVal = (current as any)[k];

        // Compare values (deep comparison for nested objects like notifications)
        const isMatch =
          typeof inFlightVal === "object" && inFlightVal !== null
            ? JSON.stringify(inFlightVal) === JSON.stringify(currentVal)
            : inFlightVal === currentVal;

        if (isMatch) {
          delete (current as any)[k];
          changed = true;
        }
      }

      if (changed) {
        if (Object.keys(current).length === 0) {
          await AsyncStorage.removeItem(key);
        } else {
          await AsyncStorage.setItem(key, JSON.stringify(current));
        }
      }
    } catch (e) {
      console.warn("[SettingsSyncManager] clearAcknowledgedDirty failed:", e);
    }
  }

  /**
   * Clears all dirty fields for a specific user scope (e.g. on clean sync or account switch).
   */
  static async clearAllDirty(userId?: string | null): Promise<void> {
    try {
      const key = this.getStorageKey(userId);
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn("[SettingsSyncManager] clearAllDirty failed:", e);
    }
  }

  /**
   * Transfers dirty fields from guest storage to authenticated user on sign-in / migration.
   */
  static async transferGuestDirtyFields(toUserId: string): Promise<void> {
    try {
      if (!toUserId) return;
      const guestDirty = await this.getDirtyFields("guest");
      if (Object.keys(guestDirty).length === 0) return;

      const userDirty = await this.getDirtyFields(toUserId);
      const merged: DirtySettingsMap = { ...userDirty, ...guestDirty };

      const userKey = this.getStorageKey(toUserId);
      await AsyncStorage.setItem(userKey, JSON.stringify(merged));
      await this.clearAllDirty("guest");
    } catch (e) {
      console.warn("[SettingsSyncManager] transferGuestDirtyFields failed:", e);
    }
  }
}

/**
 * Maps Settings object keys to Supabase user_settings database column names.
 */
export function settingsToDbColumns(settings: Partial<Settings>): Record<string, any> {
  const map: Record<string, any> = {};
  if (settings.themeId !== undefined) map.theme_id = settings.themeId;
  if (settings.numberStyle !== undefined) map.number_style = settings.numberStyle;
  if (settings.numberAnimation !== undefined) map.number_animation = settings.numberAnimation;
  if (settings.textSize !== undefined) map.text_size = settings.textSize;
  if (settings.haptics !== undefined) map.haptics = settings.haptics;
  if (settings.hapticIntensity !== undefined) map.haptic_intensity = settings.hapticIntensity;
  if (settings.soundEnabled !== undefined) map.sound_enabled = settings.soundEnabled;
  if (settings.soundVolume !== undefined) map.sound_volume = settings.soundVolume;
  if (settings.showProximity !== undefined) map.show_proximity = settings.showProximity;
  if (settings.showTimer !== undefined) map.show_timer = settings.showTimer;
  if (settings.showRangeBar !== undefined) map.show_range_bar = settings.showRangeBar;
  if (settings.tutorialCompleted !== undefined) map.tutorial_completed = settings.tutorialCompleted;
  if (settings.highContrast !== undefined) map.high_contrast = settings.highContrast;
  if (settings.colorBlindMode !== undefined) map.color_blind_mode = settings.colorBlindMode;
  if (settings.reducedMotion !== undefined) map.reduced_motion = settings.reducedMotion;
  if (settings.leftHandedControls !== undefined) map.left_handed_controls = settings.leftHandedControls;
  if (settings.language !== undefined) map.language = settings.language;
  if (settings.digitFormat !== undefined) map.digit_format = settings.digitFormat;
  if (settings.notifications !== undefined) map.notifications = settings.notifications;
  return map;
}

/**
 * Maps Supabase user_settings database columns to Settings object keys.
 */
export function dbColumnsToSettings(row: Record<string, any>): Partial<Settings> {
  const s: Partial<Settings> = {};
  if (row.theme_id !== undefined && row.theme_id !== null) s.themeId = row.theme_id;
  if (row.number_style !== undefined && row.number_style !== null) s.numberStyle = row.number_style;
  if (row.number_animation !== undefined && row.number_animation !== null) s.numberAnimation = row.number_animation;
  if (row.text_size !== undefined && row.text_size !== null) s.textSize = row.text_size;
  if (row.haptics !== undefined && row.haptics !== null) s.haptics = row.haptics;
  if (row.haptic_intensity !== undefined && row.haptic_intensity !== null) s.hapticIntensity = row.haptic_intensity;
  if (row.sound_enabled !== undefined && row.sound_enabled !== null) s.soundEnabled = row.sound_enabled;
  if (row.sound_volume !== undefined && row.sound_volume !== null) s.soundVolume = row.sound_volume;
  if (row.show_proximity !== undefined && row.show_proximity !== null) s.showProximity = row.show_proximity;
  if (row.show_timer !== undefined && row.show_timer !== null) s.showTimer = row.show_timer;
  if (row.show_range_bar !== undefined && row.show_range_bar !== null) s.showRangeBar = row.show_range_bar;
  if (row.tutorial_completed !== undefined && row.tutorial_completed !== null) s.tutorialCompleted = row.tutorial_completed;
  if (row.high_contrast !== undefined && row.high_contrast !== null) s.highContrast = row.high_contrast;
  if (row.color_blind_mode !== undefined && row.color_blind_mode !== null) s.colorBlindMode = row.color_blind_mode;
  if (row.reduced_motion !== undefined && row.reduced_motion !== null) s.reducedMotion = row.reduced_motion;
  if (row.left_handed_controls !== undefined && row.left_handed_controls !== null) s.leftHandedControls = row.left_handed_controls;
  if (row.language !== undefined && row.language !== null) s.language = row.language;
  if (row.digit_format !== undefined && row.digit_format !== null) s.digitFormat = row.digit_format;
  if (row.notifications !== undefined && row.notifications !== null) s.notifications = row.notifications;
  return s;
}

