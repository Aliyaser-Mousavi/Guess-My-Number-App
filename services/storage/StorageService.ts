import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_STATE_V2,
  type AppStateV2,
  type PlayerStats,
  type Settings,
} from "@/types/game";
import {
  migrateV1ToV2,
  validateAndMergeSettings,
  validateAndMergeStateV2,
  validateAndMergeStats,
} from "./MigrationService";
import { STORAGE_VERSION, StorageKeys } from "./StorageKeys";

export class StorageService {
  /**
   * Loads the root application state with automatic migration and corruption protection.
   */
  static async loadState(): Promise<AppStateV2> {
    try {
      const versionStr = await AsyncStorage.getItem(StorageKeys.SCHEMA_VERSION);
      const currentVersion = versionStr ? parseInt(versionStr, 10) : 0;

      // Case 1: Already at current schema version (V2)
      if (currentVersion >= STORAGE_VERSION) {
        const rawV2 = await AsyncStorage.getItem(StorageKeys.STATE_V2);
        if (rawV2) {
          try {
            const parsed = JSON.parse(rawV2);
            return validateAndMergeStateV2(parsed);
          } catch (parseError) {
            // Corrupted JSON guard: save backup, do not silently destroy
            await this.backupCorruptedData(rawV2);
            console.warn(
              "[StorageService] Failed to parse StateV2, falling back to defaults with backup created:",
              parseError,
            );
          }
        }
      }

      // Case 2: Migration from legacy V1 storage or first run
      const [rawLegacyStats, rawLegacySettings] = await Promise.all([
        AsyncStorage.getItem(StorageKeys.LEGACY_STATS),
        AsyncStorage.getItem(StorageKeys.LEGACY_SETTINGS),
      ]);

      if (rawLegacyStats || rawLegacySettings) {
        let legacyStats: PlayerStats = DEFAULT_STATS;
        let legacySettings: Settings = DEFAULT_SETTINGS;

        if (rawLegacyStats) {
          try {
            legacyStats = validateAndMergeStats(JSON.parse(rawLegacyStats));
          } catch (e) {
            await this.backupCorruptedData(rawLegacyStats);
            console.warn("[StorageService] Corrupted legacy stats backed up:", e);
          }
        }

        if (rawLegacySettings) {
          try {
            legacySettings = validateAndMergeSettings(JSON.parse(rawLegacySettings));
          } catch (e) {
            await this.backupCorruptedData(rawLegacySettings);
            console.warn("[StorageService] Corrupted legacy settings backed up:", e);
          }
        }

        const migratedState = migrateV1ToV2(legacyStats, legacySettings);
        // Persist migrated state immediately
        await this.saveState(migratedState);
        await AsyncStorage.setItem(
          StorageKeys.SCHEMA_VERSION,
          String(STORAGE_VERSION),
        );
        return migratedState;
      }

      // Case 3: Fresh install
      const freshState = {
        ...DEFAULT_STATE_V2,
        profile: {
          ...DEFAULT_STATE_V2.profile,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        lastSavedAt: Date.now(),
      };
      await this.saveState(freshState);
      await AsyncStorage.setItem(
        StorageKeys.SCHEMA_VERSION,
        String(STORAGE_VERSION),
      );
      return freshState;
    } catch (error) {
      console.error("[StorageService] Critical error during loadState:", error);
      return { ...DEFAULT_STATE_V2 };
    }
  }

  /**
   * Persists application state safely with legacy backward-compatibility syncing.
   */
  static async saveState(state: AppStateV2): Promise<void> {
    try {
      const stateToSave: AppStateV2 = {
        ...state,
        lastSavedAt: Date.now(),
      };

      const serialized = JSON.stringify(stateToSave);

      // Save primary V2 state, schema version, and keep legacy keys synchronized
      await Promise.all([
        AsyncStorage.setItem(StorageKeys.STATE_V2, serialized),
        AsyncStorage.setItem(
          StorageKeys.SCHEMA_VERSION,
          String(STORAGE_VERSION),
        ),
        AsyncStorage.setItem(
          StorageKeys.LEGACY_STATS,
          JSON.stringify(stateToSave.stats),
        ),
        AsyncStorage.setItem(
          StorageKeys.LEGACY_SETTINGS,
          JSON.stringify(stateToSave.settings),
        ),
      ]);
    } catch (error) {
      console.error("[StorageService] Failed to save state:", error);
      throw error;
    }
  }

  /**
   * Resets player progress while preserving user settings and cosmetics.
   */
  static async resetPlayerProgress(currentState: AppStateV2): Promise<AppStateV2> {
    const nextState: AppStateV2 = {
      ...DEFAULT_STATE_V2,
      profile: {
        ...currentState.profile,
        updatedAt: Date.now(),
      },
      settings: currentState.settings,
      cosmetics: currentState.cosmetics,
      lastSavedAt: Date.now(),
    };

    await this.saveState(nextState);
    return nextState;
  }

  /**
   * Safeguards corrupted data into a separate AsyncStorage key for forensics/recovery.
   */
  private static async backupCorruptedData(rawContent: string): Promise<void> {
    try {
      const backupKey = `${StorageKeys.CORRUPT_BACKUP_PREFIX}${Date.now()}`;
      await AsyncStorage.setItem(backupKey, rawContent);
    } catch {
      // Best-effort backup
    }
  }
}

