import test from "node:test";
import assert from "node:assert/strict";

// ==============================================================================
// 1. In-Memory AsyncStorage Simulator
// ==============================================================================
class MockAsyncStorage {
  constructor() {
    this.store = new Map();
  }
  async getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async setItem(key, value) {
    this.store.set(key, String(value));
  }
  async removeItem(key) {
    this.store.delete(key);
  }
  async clear() {
    this.store.clear();
  }
}

const mockStorage = new MockAsyncStorage();

// Storage keys
const StorageKeys = {
  DIRTY_SETTINGS_PREFIX: "@gmn/dirty_settings_",
};

// ==============================================================================
// 2. SettingsSyncManager Implementation Under Test
// ==============================================================================
class SettingsSyncManagerTest {
  static getStorageKey(userId) {
    const scope = userId && userId.trim().length > 0 ? userId.trim() : "guest";
    return `${StorageKeys.DIRTY_SETTINGS_PREFIX}${scope}`;
  }

  static async getDirtyFields(userId) {
    try {
      const key = this.getStorageKey(userId);
      const raw = await mockStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return {};
      return parsed;
    } catch {
      return {};
    }
  }

  static async markDirty(patch, userId) {
    if (!patch || Object.keys(patch).length === 0) return;
    const key = this.getStorageKey(userId);
    const current = await this.getDirtyFields(userId);
    const updated = { ...current };

    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) {
        updated[k] = v;
      }
    }

    await mockStorage.setItem(key, JSON.stringify(updated));
  }

  static async clearAcknowledgedDirty(acknowledgedPatch, userId) {
    if (!acknowledgedPatch || Object.keys(acknowledgedPatch).length === 0) return;
    const key = this.getStorageKey(userId);
    const current = await this.getDirtyFields(userId);
    let changed = false;

    for (const [k, inFlightVal] of Object.entries(acknowledgedPatch)) {
      if (!(k in current)) continue;
      const currentVal = current[k];

      const isMatch =
        typeof inFlightVal === "object" && inFlightVal !== null
          ? JSON.stringify(inFlightVal) === JSON.stringify(currentVal)
          : inFlightVal === currentVal;

      if (isMatch) {
        delete current[k];
        changed = true;
      }
    }

    if (changed) {
      if (Object.keys(current).length === 0) {
        await mockStorage.removeItem(key);
      } else {
        await mockStorage.setItem(key, JSON.stringify(current));
      }
    }
  }

  static async clearAllDirty(userId) {
    const key = this.getStorageKey(userId);
    await mockStorage.removeItem(key);
  }

  static async transferGuestDirtyFields(toUserId) {
    if (!toUserId) return;
    const guestDirty = await this.getDirtyFields("guest");
    if (Object.keys(guestDirty).length === 0) return;

    const userDirty = await this.getDirtyFields(toUserId);
    const merged = { ...userDirty, ...guestDirty };

    const userKey = this.getStorageKey(toUserId);
    await mockStorage.setItem(userKey, JSON.stringify(merged));
    await this.clearAllDirty("guest");
  }
}

// ==============================================================================
// 3. Mapping Utilities (TypeScript Settings <-> Supabase user_settings)
// ==============================================================================
function settingsToDbColumns(settings) {
  const map = {};
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

function dbColumnsToSettings(row) {
  const s = {};
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

const DEFAULT_SETTINGS = {
  haptics: true,
  hapticIntensity: "medium",
  soundEnabled: true,
  soundVolume: 0.8,
  showProximity: true,
  showTimer: true,
  showRangeBar: true,
  tutorialCompleted: false,
  themeId: "midnight",
  numberStyle: "arcade_glow",
  numberAnimation: "pulse",
  textSize: "normal",
  highContrast: false,
  colorBlindMode: "none",
  reducedMotion: false,
  leftHandedControls: false,
  language: "en",
  digitFormat: "latin",
  notifications: {
    dailyReminder: false,
    dailyReminderTime: "09:00",
    missionReminder: false,
    streakReminder: false,
    eventReminder: false,
    permissionGranted: false,
  },
};

// ==============================================================================
// 4. Mock Supabase Cloud Database Simulator (Database-Managed Versioning & OCC)
// ==============================================================================
class MockSupabaseDatabase {
  constructor() {
    this.userSettingsTable = new Map();
    this.shouldFailNextUpdate = false;
  }

  async selectSettings(userId) {
    const row = this.userSettingsTable.get(userId);
    return row ? { ...row } : null;
  }

  async insertSettings(record) {
    if (this.userSettingsTable.has(record.user_id)) {
      throw new Error(`Unique constraint violation: user_id ${record.user_id} already exists`);
    }
    // Database trigger trg_user_settings_insert enforces version = 1 and server timestamp
    const cleanRecord = {
      ...record,
      version: 1,
      updated_at: new Date().toISOString(),
    };
    this.userSettingsTable.set(record.user_id, cleanRecord);
    return { data: [cleanRecord], error: null };
  }

  /**
   * Atomic Optimistic Concurrency Update.
   * Simulates PostgreSQL trigger:
   * 1. If expectedVersion is supplied and does not match current version, updates 0 rows.
   * 2. If version matches, triggers: NEW.version = OLD.version + 1; NEW.updated_at = now();
   * 3. Ignores any client-supplied version or updated_at.
   */
  async updateSettings(userId, patch, expectedVersion = null) {
    if (this.shouldFailNextUpdate) {
      this.shouldFailNextUpdate = false;
      throw new Error("Network request failed");
    }
    const current = this.userSettingsTable.get(userId);
    if (!current) {
      throw new Error(`User ${userId} not found`);
    }

    // Optimistic Concurrency Check: WHERE user_id = $1 AND version = $2
    if (expectedVersion !== null && current.version !== expectedVersion) {
      // 0 rows updated due to version mismatch (stale update collision)
      return { data: [], count: 0, error: null };
    }

    // Clean patch: strip any client attempts to spoof version or updated_at
    const { version: _v, updated_at: _u, user_id: _uid, ...safePatch } = patch;

    const updated = {
      ...current,
      ...safePatch,
      version: current.version + 1, // Database-managed atomic increment
      updated_at: new Date().toISOString(), // Server-managed timestamp
    };
    this.userSettingsTable.set(userId, updated);
    return { data: [updated], count: 1, error: null };
  }
}

// CloudSyncService.syncSettings logic simulator with OCC
async function executeSyncSettings(
  localSettings,
  userId,
  db,
  baselineVersion = null,
  simulateRaceInsert = false,
) {
  try {
    const dirtyFields = await SettingsSyncManagerTest.getDirtyFields(userId);
    const dirtyKeys = Object.keys(dirtyFields);
    const hasDirty = dirtyKeys.length > 0;

    const cloudRow = simulateRaceInsert ? null : await db.selectSettings(userId);
    const nowIso = new Date().toISOString();

    if (!cloudRow) {
      // First time insert
      const initialPayload = {
        user_id: userId,
        ...settingsToDbColumns(localSettings),
        client_modified_at: nowIso,
      };
      try {
        await db.insertSettings(initialPayload);
      } catch (insertErr) {
        // Race recovery: another device inserted row simultaneously (Test E)
        if (insertErr.message?.includes("Unique constraint violation")) {
          const racedRow = await db.selectSettings(userId);
          if (racedRow) {
            const racedRemote = dbColumnsToSettings(racedRow);
            const racedMerged = { ...localSettings, ...racedRemote };
            for (const k of dirtyKeys) {
              racedMerged[k] = dirtyFields[k];
            }
            if (hasDirty) {
              const inFlightSnapshot = { ...dirtyFields };
              const retryPayload = {
                ...settingsToDbColumns(inFlightSnapshot),
                client_modified_at: new Date().toISOString(),
              };
              const { data: retryRows, error: retryErr } = await db.updateSettings(
                userId,
                retryPayload,
                racedRow.version || 1,
              );
              if (retryErr || !retryRows || retryRows.length === 0) {
                return { settings: racedMerged, synced: false };
              }
              await SettingsSyncManagerTest.clearAcknowledgedDirty(inFlightSnapshot, userId);
            }
            return { settings: racedMerged, synced: true, raceRecovered: true };
          }
        }
        throw insertErr;
      }
      if (hasDirty) {
        await SettingsSyncManagerTest.clearAcknowledgedDirty(dirtyFields, userId);
      }
      return { settings: localSettings, synced: true };
    }

    const remoteSettings = dbColumnsToSettings(cloudRow);

    // Merge: Non-dirty adopt cloud, dirty adopt local
    const merged = {
      ...localSettings,
      ...remoteSettings,
    };
    for (const k of dirtyKeys) {
      merged[k] = dirtyFields[k];
    }

    if (hasDirty) {
      const inFlightSnapshot = { ...dirtyFields };
      // If client had a cached version prior to going offline, use baselineVersion; otherwise use cloudRow.version
      const expectedVersion = baselineVersion !== null ? baselineVersion : (cloudRow.version || 1);
      const updatePayload = {
        ...settingsToDbColumns(inFlightSnapshot),
        client_modified_at: nowIso,
      };

      // Atomic conditional update: WHERE user_id = $userId AND version = $expectedVersion
      const { data: updatedRows, error: updateErr } = await db.updateSettings(
        userId,
        updatePayload,
        expectedVersion,
      );

      if (updateErr) throw updateErr;

      // Stale update detected (0 rows updated due to version mismatch)
      if (!updatedRows || updatedRows.length === 0) {
        // Concurrency conflict! Fetch fresh cloud row and rebase
        const freshCloudRow = await db.selectSettings(userId);
        if (!freshCloudRow) {
          return { settings: merged, synced: false };
        }

        const freshRemoteSettings = dbColumnsToSettings(freshCloudRow);
        const reMerged = {
          ...localSettings,
          ...freshRemoteSettings,
        };
        for (const k of dirtyKeys) {
          reMerged[k] = inFlightSnapshot[k];
        }

        // Retry update against the fresh version
        const retryExpectedVersion = freshCloudRow.version;
        const retryPayload = {
          ...settingsToDbColumns(inFlightSnapshot),
          client_modified_at: new Date().toISOString(),
        };

        const { data: retryRows, error: retryErr } = await db.updateSettings(
          userId,
          retryPayload,
          retryExpectedVersion,
        );

        if (retryErr || !retryRows || retryRows.length === 0) {
          // Still in conflict or failed: preserve dirty fields and return
          return { settings: reMerged, synced: false };
        }

        // Retry succeeded! Clear acknowledged dirty fields
        await SettingsSyncManagerTest.clearAcknowledgedDirty(inFlightSnapshot, userId);
        return { settings: reMerged, synced: true, conflictResolved: true };
      }

      await SettingsSyncManagerTest.clearAcknowledgedDirty(inFlightSnapshot, userId);
    }

    return { settings: merged, synced: true };
  } catch (err) {
    return { settings: localSettings, synced: false, error: err.message };
  }
}

// ==============================================================================
// 5. TEST SUITE
// ==============================================================================

test("Unit: settingsToDbColumns and dbColumnsToSettings round-trip", () => {
  const dbCols = settingsToDbColumns(DEFAULT_SETTINGS);
  assert.equal(dbCols.theme_id, "midnight");
  assert.equal(dbCols.number_style, "arcade_glow");
  assert.equal(dbCols.sound_volume, 0.8);
  assert.equal(dbCols.language, "en");

  const restored = dbColumnsToSettings(dbCols);
  assert.equal(restored.themeId, "midnight");
  assert.equal(restored.numberStyle, "arcade_glow");
  assert.equal(restored.soundVolume, 0.8);
  assert.equal(restored.language, "en");
});

test("Unit: Database strictly manages version increments and ignores client tampering", async () => {
  const db = new MockSupabaseDatabase();
  const userId = "user_version_tamper";

  // Insert initializes version to 1 regardless of client input
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    version: 9999, // Attempted tamper
  });
  const row1 = await db.selectSettings(userId);
  assert.equal(row1.version, 1, "Database trigger must initialize version to 1");

  // Client attempts to jump version to 50 on update
  await db.updateSettings(userId, { theme_id: "ocean", version: 50 }, 1);
  const row2 = await db.selectSettings(userId);
  assert.equal(row2.version, 2, "Database trigger must increment version atomically to 2");
  assert.equal(row2.theme_id, "ocean");
});

test("Unit: SettingsSyncManager clearAcknowledgedDirty in-flight race condition", async () => {
  await mockStorage.clear();
  const userId = "user_race_1";

  // 1. User changes soundVolume to 0.5
  await SettingsSyncManagerTest.markDirty({ soundVolume: 0.5 }, userId);
  const inFlightSnapshot = { soundVolume: 0.5 };

  // 2. While upload is in flight, user moves slider to 0.2
  await SettingsSyncManagerTest.markDirty({ soundVolume: 0.2 }, userId);

  // 3. Upload finishes for 0.5 and server acknowledges
  await SettingsSyncManagerTest.clearAcknowledgedDirty(inFlightSnapshot, userId);

  // 4. Verify soundVolume is STILL dirty with value 0.2
  const currentDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.equal(currentDirty.soundVolume, 0.2, "User's in-flight edit (0.2) must not be erased!");
});

test("Scenario A: Existing Cloud Settings (Device B Fresh Install)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_a";

  // Device A previously set theme to 'ocean' and soundVolume to 0.4
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    theme_id: "ocean",
    sound_volume: 0.4,
  });

  // Device B installs fresh app (default theme is 'midnight', soundVolume is 0.8)
  const deviceBLocalSettings = { ...DEFAULT_SETTINGS };
  const deviceBDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.deepEqual(deviceBDirty, {}, "Device B has no dirty fields on fresh install");

  // Device B logs in and runs sync
  const syncResult = await executeSyncSettings(deviceBLocalSettings, userId, db);

  assert.equal(syncResult.synced, true);
  assert.equal(syncResult.settings.themeId, "ocean", "Device B adopts cloud theme 'ocean'");
  assert.equal(syncResult.settings.soundVolume, 0.4, "Device B adopts cloud soundVolume 0.4");

  // Verify cloud was NOT overwritten by Device B's default 'midnight'
  const cloudAfter = await db.selectSettings(userId);
  assert.equal(cloudAfter.theme_id, "ocean", "Cloud settings MUST NOT be overwritten by Device B's local default");
  assert.equal(cloudAfter.sound_volume, 0.4);
});

test("Scenario B: Genuine Local Change", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_b";

  // Cloud already has theme 'ocean' and haptics true
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    theme_id: "ocean",
    haptics: true,
  });

  // User explicitly toggles haptics = false on Device B
  await SettingsSyncManagerTest.markDirty({ haptics: false }, userId);
  const localSettings = { ...DEFAULT_SETTINGS, themeId: "ocean", haptics: false };

  // Sync runs
  const syncResult = await executeSyncSettings(localSettings, userId, db);

  assert.equal(syncResult.synced, true);
  assert.equal(syncResult.settings.haptics, false, "Local haptics=false is preserved");
  assert.equal(syncResult.settings.themeId, "ocean", "Cloud theme 'ocean' is preserved");

  // Verify cloud received haptics: false and incremented version atomically
  const cloudAfter = await db.selectSettings(userId);
  assert.equal(cloudAfter.haptics, false, "Cloud updated with genuine local change");
  assert.equal(cloudAfter.theme_id, "ocean", "Untouched cloud field remains unchanged");
  assert.equal(cloudAfter.version, 2, "Version incremented atomically by database trigger");

  // Verify dirty field was cleared
  const remainingDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.deepEqual(remainingDirty, {}, "Acknowledged dirty fields are cleared");
});

test("Scenario C: App Restart (Offline Edit Survival)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_c";

  // Cloud has soundEnabled = true
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    sound_enabled: true,
  });

  // User modifies soundEnabled = false while offline
  await SettingsSyncManagerTest.markDirty({ soundEnabled: false }, userId);

  // App restarts! Re-read dirty fields after app startup
  const restoredDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.equal(restoredDirty.soundEnabled, false, "Dirty soundEnabled must survive app restart");

  // App goes online and syncs
  const localSettings = { ...DEFAULT_SETTINGS, soundEnabled: false };
  const syncResult = await executeSyncSettings(localSettings, userId, db);

  assert.equal(syncResult.synced, true);
  const cloudAfter = await db.selectSettings(userId);
  assert.equal(cloudAfter.sound_enabled, false, "Cloud updated with offline change after restart");
  assert.deepEqual(await SettingsSyncManagerTest.getDirtyFields(userId), {});
});

test("Scenario D: Failed Upload (Network Error Protection)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_d";

  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    haptic_intensity: "medium",
  });

  // User changes hapticIntensity to 'heavy'
  await SettingsSyncManagerTest.markDirty({ hapticIntensity: "heavy" }, userId);

  // Network fails during sync
  db.shouldFailNextUpdate = true;
  const localSettings = { ...DEFAULT_SETTINGS, hapticIntensity: "heavy" };
  const syncResult = await executeSyncSettings(localSettings, userId, db);

  assert.equal(syncResult.synced, false, "Sync reported failure");

  // Verify dirty field is NOT lost or cleared!
  const dirtyAfterFailure = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.equal(dirtyAfterFailure.hapticIntensity, "heavy", "Dirty field must remain intact after failed sync");

  // Reconnection and retry sync
  const retryResult = await executeSyncSettings(localSettings, userId, db);
  assert.equal(retryResult.synced, true, "Retry succeeded");

  const cloudAfter = await db.selectSettings(userId);
  assert.equal(cloudAfter.haptic_intensity, "heavy", "Cloud successfully updated on retry");
  assert.deepEqual(await SettingsSyncManagerTest.getDirtyFields(userId), {});
});

test("Scenario E: Simultaneous Non-Overlapping Changes (Device A & Device B)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_e";

  // Initial cloud state (version 1)
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    language: "en",
    text_size: "normal",
  });

  // Device A modifies language to 'fa'
  await SettingsSyncManagerTest.markDirty({ language: "fa" }, `${userId}_devA`);
  // Device B modifies textSize to 'large'
  await SettingsSyncManagerTest.markDirty({ textSize: "large" }, `${userId}_devB`);

  // Device A syncs first:
  const devADirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_devA`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(devADirty));

  const syncResultA = await executeSyncSettings({ ...DEFAULT_SETTINGS, language: "fa" }, userId, db);
  assert.equal(syncResultA.synced, true);
  assert.equal(syncResultA.settings.language, "fa");

  // Device B syncs second:
  const devBDirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_devB`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(devBDirty));

  const syncResultB = await executeSyncSettings({ ...DEFAULT_SETTINGS, textSize: "large" }, userId, db);
  assert.equal(syncResultB.synced, true);

  // Both changes must be merged into Device B's state!
  assert.equal(syncResultB.settings.language, "fa", "Device B adopts Device A's language='fa'");
  assert.equal(syncResultB.settings.textSize, "large", "Device B preserves its own textSize='large'");

  // Verify cloud row has BOTH changes merged
  const cloudFinal = await db.selectSettings(userId);
  assert.equal(cloudFinal.language, "fa", "Cloud has Device A's change");
  assert.equal(cloudFinal.text_size, "large", "Cloud has Device B's change");
  assert.equal(cloudFinal.version, 3, "Cloud version incremented twice atomically");
});

test("Scenario F: Account Switching (Cross-Account Contamination Guard)", async () => {
  await mockStorage.clear();
  const user1 = "account_alpha";
  const user2 = "account_beta";

  // Account 1 sets showTimer = false
  await SettingsSyncManagerTest.markDirty({ showTimer: false }, user1);

  // User logs out of Account 1. Guest dirty state is cleared.
  await SettingsSyncManagerTest.clearAllDirty("guest");

  // User logs into Account 2
  const user2Dirty = await SettingsSyncManagerTest.getDirtyFields(user2);
  assert.deepEqual(user2Dirty, {}, "Account 2 must start with 0 dirty fields; no leakage from Account 1");

  // Account 2 modifies showRangeBar = false
  await SettingsSyncManagerTest.markDirty({ showRangeBar: false }, user2);

  // Verify Account 1 still has only its own dirty fields
  const user1DirtyAfter = await SettingsSyncManagerTest.getDirtyFields(user1);
  assert.equal(user1DirtyAfter.showTimer, false);
  assert.equal(user1DirtyAfter.showRangeBar, undefined, "Account 2 change must NOT leak into Account 1");

  // Verify Account 2 has only its own dirty fields
  const user2DirtyAfter = await SettingsSyncManagerTest.getDirtyFields(user2);
  assert.equal(user2DirtyAfter.showRangeBar, false);
  assert.equal(user2DirtyAfter.showTimer, undefined, "Account 1 change must NOT leak into Account 2");
});

test("Scenario G: Same-Field Offline Conflict (Optimistic Concurrency Detection & Rebase)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_scenario_g";

  // Initial cloud state: theme = 'midnight', version = 1
  await db.insertSettings({
    user_id: userId,
    ...settingsToDbColumns(DEFAULT_SETTINGS),
    theme_id: "midnight",
  });

  // Device A goes offline and changes theme to 'solar_gold'
  await SettingsSyncManagerTest.markDirty({ themeId: "solar_gold" }, `${userId}_devA`);

  // Device B goes offline and changes theme to 'emerald'
  await SettingsSyncManagerTest.markDirty({ themeId: "emerald" }, `${userId}_devB`);

  // Device A reconnects first:
  // Base version is 1. Pushes themeId = 'solar_gold'.
  const devADirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_devA`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(devADirty));

  const syncResultA = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, themeId: "solar_gold" },
    userId,
    db,
  );
  assert.equal(syncResultA.synced, true);
  const cloudAfterA = await db.selectSettings(userId);
  assert.equal(cloudAfterA.theme_id, "solar_gold");
  assert.equal(cloudAfterA.version, 2, "Database trigger incremented version to 2 on Device A upload");

  // Device B reconnects second:
  // Device B had fetched version 1 before going offline.
  // Device B attempts to update with expectedVersion = 1, but cloud is already at version 2.
  const devBDirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_devB`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(devBDirty));

  // Device B's local state has themeId = 'emerald', and its cached baseline version is 1
  const syncResultB = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, themeId: "emerald" },
    userId,
    db,
    1, // baselineVersion from before Device B went offline
  );

  // Verification of Conflict Resolution Policy:
  // 1. Stale update was detected via expectedVersion = 1 mismatch.
  // 2. Dirty state was NOT discarded.
  // 3. Fresh conflict resolution pass re-based against version 2 and re-applied local intent.
  // 4. Device B's deliberate edit ('emerald') is committed as version 3.
  assert.equal(syncResultB.synced, true);
  assert.equal(syncResultB.conflictResolved, true, "Conflict resolution pass was triggered");
  assert.equal(syncResultB.settings.themeId, "emerald", "Device B preserved its local dirty change");

  const cloudFinal = await db.selectSettings(userId);
  assert.equal(cloudFinal.theme_id, "emerald", "Final cloud state reflects resolved conflict");
  assert.equal(cloudFinal.version, 3, "Version incremented to 3");

  // Verify Device B's dirty map is now clean
  const devBRemainingDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.deepEqual(devBRemainingDirty, {}, "Dirty fields cleared after acknowledged resolution");
});

test("Scenario H: Guest-to-Account Settings Migration", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const newUserId = "user_guest_migrated";
  const unrelatedUserId = "user_unrelated_target";

  // 1. Guest changes language to 'fa' and theme to 'solar_gold' while offline
  await SettingsSyncManagerTest.markDirty(
    { language: "fa", themeId: "solar_gold" },
    "guest",
  );

  const guestDirtyBefore = await SettingsSyncManagerTest.getDirtyFields("guest");
  assert.equal(guestDirtyBefore.language, "fa");
  assert.equal(guestDirtyBefore.themeId, "solar_gold");

  // 2. Guest signs up / creates an account (newUserId)
  // transferGuestDirtyFields transfers dirty settings from guest to newUserId
  await SettingsSyncManagerTest.transferGuestDirtyFields(newUserId);

  // Verify guest storage is cleaned immediately after successful transfer
  const guestDirtyAfter = await SettingsSyncManagerTest.getDirtyFields("guest");
  assert.deepEqual(guestDirtyAfter, {}, "Guest dirty storage must be empty after transfer");

  // Verify new user received the intended dirty settings
  const newUserDirty = await SettingsSyncManagerTest.getDirtyFields(newUserId);
  assert.equal(newUserDirty.language, "fa");
  assert.equal(newUserDirty.themeId, "solar_gold");

  // Verify unrelated account has 0 dirty settings (Account Isolation)
  const unrelatedDirty = await SettingsSyncManagerTest.getDirtyFields(unrelatedUserId);
  assert.deepEqual(unrelatedDirty, {}, "Unrelated account must receive 0 dirty settings");

  // 3. Initial sync runs for new user
  const initialLocalSettings = {
    ...DEFAULT_SETTINGS,
    language: "fa",
    themeId: "solar_gold",
  };
  const syncResult1 = await executeSyncSettings(initialLocalSettings, newUserId, db);
  assert.equal(syncResult1.synced, true);

  // Verify uploaded to cloud
  const cloudRow = await db.selectSettings(newUserId);
  assert.equal(cloudRow.language, "fa");
  assert.equal(cloudRow.theme_id, "solar_gold");
  assert.equal(cloudRow.version, 1);

  // Verify dirty fields for new user are now cleared
  const newUserDirtyAfterSync = await SettingsSyncManagerTest.getDirtyFields(newUserId);
  assert.deepEqual(newUserDirtyAfterSync, {}, "Dirty fields cleared after initial upload");

  // 4. Verify uploaded exactly once: subsequent sync performs 0 uploads (dirty map empty)
  const syncResult2 = await executeSyncSettings(syncResult1.settings, newUserId, db);
  assert.equal(syncResult2.synced, true);
  const cloudRow2 = await db.selectSettings(newUserId);
  assert.equal(cloudRow2.version, 1, "Cloud version must NOT increment because 0 changes were dirty");
});

test("Test E: Initial Settings Row Race (Simultaneous Account Settings Initialization)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_race_init";

  // Two devices both see that user_settings does not exist yet (cloudRow is null)
  // Device 1 has dirty soundVolume = 0.5
  // Device 2 has dirty haptics = false
  await SettingsSyncManagerTest.markDirty({ soundVolume: 0.5 }, `${userId}_dev1`);
  await SettingsSyncManagerTest.markDirty({ haptics: false }, `${userId}_dev2`);

  // Device 1 attempts initial sync and succeeds in inserting the row
  const dev1Dirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_dev1`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(dev1Dirty));
  const syncResult1 = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, soundVolume: 0.5 },
    userId,
    db,
  );
  assert.equal(syncResult1.synced, true);

  // Device 2 attempts initial sync concurrently.
  // Both devices observe cloudRow is null at start; Device 2's insert hits the Unique constraint on user_id!
  // Device 2 must catch this collision, fetch Device 1's newly created row, merge its local haptics=false, and OCC update.
  const dev2Dirty = await SettingsSyncManagerTest.getDirtyFields(`${userId}_dev2`);
  await mockStorage.setItem(SettingsSyncManagerTest.getStorageKey(userId), JSON.stringify(dev2Dirty));
  const syncResult2 = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, haptics: false },
    userId,
    db,
    null,
    true, // simulate concurrent initial insert attempt
  );

  assert.equal(syncResult2.synced, true);
  assert.equal(syncResult2.raceRecovered, true, "Device 2 recovered from initial insert race");
  assert.equal(syncResult2.settings.soundVolume, 0.5, "Device 1 change preserved");
  assert.equal(syncResult2.settings.haptics, false, "Device 2 change preserved");

  // Verify cloud row has merged both changes and advanced to version 2
  const cloudFinal = await db.selectSettings(userId);
  assert.equal(cloudFinal.sound_volume, 0.5);
  assert.equal(cloudFinal.haptics, false);
  assert.equal(cloudFinal.version, 2, "Version advanced to 2 after Device 2 OCC update");
});

test("Durability: Guest Migration Failure Retention (Storage & Upload Failures)", async () => {
  await mockStorage.clear();
  const db = new MockSupabaseDatabase();
  const userId = "user_durability_test";

  // 1. Guest has modifications
  await SettingsSyncManagerTest.markDirty({ language: "fa", textSize: "large" }, "guest");
  const guestBefore = await SettingsSyncManagerTest.getDirtyFields("guest");
  assert.equal(guestBefore.language, "fa");

  // 2. Simulate transfer
  await SettingsSyncManagerTest.transferGuestDirtyFields(userId);
  const userDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.equal(userDirty.language, "fa");
  assert.equal(userDirty.textSize, "large");

  // 3. Cloud upload fails (network drop)
  db.shouldFailNextUpdate = true;
  // Initialize cloud first so update fails
  await db.insertSettings({ user_id: userId, ...settingsToDbColumns(DEFAULT_SETTINGS) });

  const failedResult = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, language: "fa", textSize: "large" },
    userId,
    db,
  );
  assert.equal(failedResult.synced, false);

  // 4. Durability verification: Account-scoped dirty fields MUST remain intact
  const retainedDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.equal(retainedDirty.language, "fa", "Dirty fields must NOT be cleared on failed upload");
  assert.equal(retainedDirty.textSize, "large");

  // 5. Retry upload succeeds and now clears dirty fields
  const retryResult = await executeSyncSettings(
    { ...DEFAULT_SETTINGS, language: "fa", textSize: "large" },
    userId,
    db,
  );
  assert.equal(retryResult.synced, true);
  const clearedDirty = await SettingsSyncManagerTest.getDirtyFields(userId);
  assert.deepEqual(clearedDirty, {}, "Dirty fields cleared only after acknowledged success");
});
