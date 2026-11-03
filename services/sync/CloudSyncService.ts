import { supabase } from "@/lib/supabase";
import type {
  AppStateV2,
  CosmeticsState,
  GameHistoryRecord,
  Settings,
} from "@/types/game";
import type {
  GuestMigrationResult,
  SessionVerificationStatus,
  SyncResult,
} from "@/types/sync";
import { Platform } from "react-native";
import { SyncQueueService } from "./SyncQueueService";
import {
  SettingsSyncManager,
  dbColumnsToSettings,
  settingsToDbColumns,
} from "./SettingsSyncManager";

export class CloudSyncService {
  /**
   * Uploads an individual game history record as a client-reported session (SEC-01 & SEC-03).
   * Untrusted client-submitted fields are stored for personal history and replay only.
   * They do NOT directly invoke reward processing or award verified server XP.
   */
  static async uploadSession(
    record: GameHistoryRecord,
    userId: string,
    verificationStatus: SessionVerificationStatus = "client_reported",
  ): Promise<{
    success: boolean;
    verificationStatus?: SessionVerificationStatus;
    error?: string;
  }> {
    try {
      const clientSessionId = record.sessionId || record.id;
      const clientPlayedAt = new Date(
        record.timestamp || Date.now(),
      ).toISOString();

      // 1. Map client record to game_sessions table columns
      const sessionPayload = {
        user_id: userId,
        client_session_id: clientSessionId,
        mode: record.mode,
        difficulty: record.difficulty,
        won: record.won,
        rounds: Math.max(1, record.rounds),
        score: Math.max(0, record.score),
        elapsed_ms: Math.max(0, record.elapsedMs),
        hints_used: Math.max(0, record.hintsUsed),
        is_daily: Boolean(record.isDaily),
        user_number: record.userNumber,
        secret_number: record.secretNumber ?? null,
        min_range: record.minRange ?? null,
        max_range: record.maxRange ?? null,
        target_number: record.targetNumber ?? null,
        custom_config: record.customConfig ?? null,
        player1_name: record.player1Name ?? null,
        player2_name: record.player2Name ?? null,
        guesses: record.guesses ?? [],
        replay_timeline: record.timeline ?? null,
        verification_status: verificationStatus,
        processed_for_rewards: false,
        xp_awarded: 0,
        client_played_at: clientPlayedAt,
      };

      // 2. Insert into game_sessions (idempotent ON CONFLICT ignore)
      const { error: insertError } = await supabase
        .from("game_sessions")
        .upsert(sessionPayload, { onConflict: "user_id,client_session_id" });

      if (insertError) {
        // If already exists, return success idempotently
        if (insertError.code === "23505") {
          return { success: true, verificationStatus };
        }
        return { success: false, error: insertError.message };
      }

      return { success: true, verificationStatus };
    } catch (err: any) {
      return {
        success: false,
        error: err.message ?? "Failed to upload session.",
      };
    }
  }

  /**
   * Fetches cloud game sessions with pagination and transforms into GameHistoryRecord.
   */
  static async fetchCloudSessions(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<GameHistoryRecord[]> {
    try {
      const { data, error } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("client_played_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: `cloud_${row.id}`,
        sessionId: row.client_session_id,
        timestamp: new Date(
          row.client_played_at || row.created_at,
        ).getTime(),
        won: row.won,
        rounds: row.rounds,
        score: row.score,
        elapsedMs: row.elapsed_ms,
        mode: row.mode,
        difficulty: row.difficulty,
        hintsUsed: row.hints_used,
        isDaily: row.is_daily,
        guesses: row.guesses || [],
        secretNumber: row.secret_number,
        userNumber: row.user_number,
        minRange: row.min_range,
        maxRange: row.max_range,
        targetNumber: row.target_number,
        customConfig: row.custom_config,
        player1Name: row.player1_name,
        player2Name: row.player2_name,
        timeline: row.replay_timeline,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Synchronizes user preferences with genuine bidirectional merge and remote update (SEC-05).
   * Uses dirty-field tracking so unedited local defaults never overwrite existing cloud settings,
   * while explicitly modified user settings are reliably uploaded.
   */
  static async syncSettings(
    localSettings: Settings,
    userId: string,
  ): Promise<{ settings: Settings; synced: boolean }> {
    try {
      const dirtyFields = await SettingsSyncManager.getDirtyFields(userId);
      const dirtyKeys = Object.keys(dirtyFields) as (keyof Settings)[];
      const hasDirty = dirtyKeys.length > 0;

      const { data: cloudRow, error: fetchErr } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      const nowIso = new Date().toISOString();

      if (!cloudRow) {
        // Initial upload of local settings
        const initialPayload = {
          user_id: userId,
          ...settingsToDbColumns(localSettings),
          version: 1,
          client_modified_at: nowIso,
        };
        const { error: insertErr } = await supabase
          .from("user_settings")
          .insert(initialPayload);

        if (insertErr) {
          // Graceful handling of initial row insert race condition (Test E)
          // If another device inserted simultaneously, refetch and proceed to OCC update
          if (
            insertErr.code === "23505" ||
            insertErr.message?.includes("duplicate key") ||
            insertErr.message?.includes("unique")
          ) {
            const { data: racedRow } = await supabase
              .from("user_settings")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();

            if (racedRow) {
              const racedRemote = dbColumnsToSettings(racedRow);
              const racedMerged: Settings = {
                ...localSettings,
                ...racedRemote,
              };
              for (const k of dirtyKeys) {
                (racedMerged as any)[k] = dirtyFields[k];
              }

              if (hasDirty) {
                const inFlightSnapshot = { ...dirtyFields };
                const retryPayload = {
                  ...settingsToDbColumns(inFlightSnapshot),
                  client_modified_at: new Date().toISOString(),
                };
                const { data: retryRows, error: retryErr } = await supabase
                  .from("user_settings")
                  .update(retryPayload)
                  .eq("user_id", userId)
                  .eq("version", racedRow.version || 1)
                  .select();

                if (retryErr || !retryRows || retryRows.length === 0) {
                  return { settings: racedMerged, synced: false };
                }
                await SettingsSyncManager.clearAcknowledgedDirty(
                  inFlightSnapshot,
                  userId,
                );
              }
              return { settings: racedMerged, synced: true };
            }
          }
          throw insertErr;
        }

        if (hasDirty) {
          await SettingsSyncManager.clearAcknowledgedDirty(dirtyFields, userId);
        }
        return { settings: localSettings, synced: true };
      }

      // Remote cloud row exists
      const remoteSettings = dbColumnsToSettings(cloudRow);

      // Merge: Non-dirty fields adopt cloud settings; dirty fields retain local changes
      const merged: Settings = {
        ...localSettings,
        ...remoteSettings,
      };

      for (const k of dirtyKeys) {
        (merged as any)[k] = dirtyFields[k];
      }

      // If user had local modifications, upload only the dirty fields with optimistic concurrency control
      if (hasDirty) {
        const inFlightSnapshot = { ...dirtyFields };
        const expectedVersion = cloudRow.version || 1;
        const updatePayload = {
          ...settingsToDbColumns(inFlightSnapshot),
          client_modified_at: nowIso,
        };

        // Atomic Optimistic Concurrency Update
        // Uses database-managed versioning; matches user_id AND expectedVersion
        const { data: updatedRows, error: updateErr } = await supabase
          .from("user_settings")
          .update(updatePayload)
          .eq("user_id", userId)
          .eq("version", expectedVersion)
          .select();

        if (updateErr) throw updateErr;

        // If 0 rows updated, a concurrency conflict occurred (stale version detected)
        if (!updatedRows || updatedRows.length === 0) {
          console.warn(
            `[CloudSyncService] Optimistic concurrency conflict on version ${expectedVersion}. Retrying with fresh conflict-resolution pass.`,
          );

          // 1. Fetch fresh server row
          const { data: freshCloudRow, error: freshErr } = await supabase
            .from("user_settings")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

          if (freshErr || !freshCloudRow) {
            // Cannot reach server or fetch fresh row: preserve dirty fields and return
            return { settings: merged, synced: false };
          }

          const freshRemoteSettings = dbColumnsToSettings(freshCloudRow);
          // 2. Fresh merge: non-dirty adopt fresh server state, dirty fields retain local changes
          const reMerged: Settings = {
            ...localSettings,
            ...freshRemoteSettings,
          };
          for (const k of dirtyKeys) {
            (reMerged as any)[k] = inFlightSnapshot[k];
          }

          // 3. Retry update against fresh server version
          const retryExpectedVersion = freshCloudRow.version;
          const retryPayload = {
            ...settingsToDbColumns(inFlightSnapshot),
            client_modified_at: new Date().toISOString(),
          };

          const { data: retryRows, error: retryErr } = await supabase
            .from("user_settings")
            .update(retryPayload)
            .eq("user_id", userId)
            .eq("version", retryExpectedVersion)
            .select();

          if (retryErr || !retryRows || retryRows.length === 0) {
            // Still in conflict or network drop: NEVER clear dirty fields
            return { settings: reMerged, synced: false };
          }

          // Acknowledged on retry! Clear acknowledged dirty fields
          await SettingsSyncManager.clearAcknowledgedDirty(
            inFlightSnapshot,
            userId,
          );
          return { settings: reMerged, synced: true };
        }

        // Successfully updated on first attempt!
        await SettingsSyncManager.clearAcknowledgedDirty(
          inFlightSnapshot,
          userId,
        );
      }

      return { settings: merged, synced: true };
    } catch {
      return { settings: localSettings, synced: false };
    }
  }

  /**
   * Reads official server-verified achievements and merges down to local state (SEC-07).
   * Direct client writes to user_achievements are blocked by database RLS.
   */
  static async syncAchievements(
    localUnlocked: string[],
    userId: string,
  ): Promise<string[]> {
    try {
      const { data: cloudAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId);

      const cloudSet = new Set(
        (cloudAchievements || []).map((a) => a.achievement_id),
      );
      // Union server unlocks with local unlocks
      const unionSet = new Set([...localUnlocked, ...cloudSet]);

      return Array.from(unionSet);
    } catch {
      return localUnlocked;
    }
  }

  /**
   * Reads official server cosmetic inventory and merges into local state (SEC-02).
   * Direct client insertion to user_cosmetic_unlocks is blocked by database RLS.
   */
  static async syncCosmetics(
    localCosmetics: CosmeticsState,
    userId: string,
  ): Promise<CosmeticsState> {
    try {
      const { data: cloudUnlocks } = await supabase
        .from("user_cosmetic_unlocks")
        .select("*")
        .eq("user_id", userId);

      const nextState: CosmeticsState = {
        ...localCosmetics,
        unlockedAvatars: [...localCosmetics.unlockedAvatars],
        unlockedThemes: [...localCosmetics.unlockedThemes],
        unlockedNumberStyles: [...localCosmetics.unlockedNumberStyles],
        unlockedTitles: [...(localCosmetics.unlockedTitles || [])],
      };

      for (const item of cloudUnlocks || []) {
        if (
          item.cosmetic_type === "avatar" &&
          !nextState.unlockedAvatars.includes(item.cosmetic_id)
        ) {
          nextState.unlockedAvatars.push(item.cosmetic_id);
        } else if (
          item.cosmetic_type === "theme" &&
          !nextState.unlockedThemes.includes(item.cosmetic_id)
        ) {
          nextState.unlockedThemes.push(item.cosmetic_id);
        } else if (
          item.cosmetic_type === "number_style" &&
          !nextState.unlockedNumberStyles.includes(item.cosmetic_id)
        ) {
          nextState.unlockedNumberStyles.push(item.cosmetic_id);
        } else if (
          item.cosmetic_type === "title" &&
          !nextState.unlockedTitles?.includes(item.cosmetic_id)
        ) {
          nextState.unlockedTitles?.push(item.cosmetic_id);
        }
      }

      return nextState;
    } catch {
      return localCosmetics;
    }
  }

  /**
   * Performs safe guest-to-account data migration (SEC-04 & SEC-09).
   * Preserves historical stats in legacy_progress_imports (is_verified = false).
   * Preserves historical matches as 'legacy_unverified' for local view/replay.
   * NEVER executes reward processing or generates verified server XP for guest games!
   */
  static async migrateGuestToAccount(
    guestSnapshot: AppStateV2,
    userId: string,
  ): Promise<GuestMigrationResult> {
    try {
      let legacyImported = false;

      // 1. One-time legacy progress snapshot with strictly is_verified = false
      const { data: existingImport } = await supabase
        .from("legacy_progress_imports")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingImport) {
        const { error: importError } = await supabase
          .from("legacy_progress_imports")
          .insert({
            user_id: userId,
            legacy_stats: guestSnapshot.stats,
            legacy_xp: guestSnapshot.progression.totalXp,
            legacy_level: guestSnapshot.progression.level,
            legacy_rank: guestSnapshot.progression.rankTitle,
            unlocked_achievements:
              guestSnapshot.stats.unlockedAchievements || [],
            unlocked_cosmetics: {
              avatars: guestSnapshot.cosmetics.unlockedAvatars,
              themes: guestSnapshot.cosmetics.unlockedThemes,
            },
            is_verified: false,
          });

        if (!importError) {
          legacyImported = true;
        }
      }

      // 2. Upload local game history as 'legacy_unverified' (SEC-04)
      // Preserved for personal history, but NEVER processed for server XP
      let sessionsUploaded = 0;
      for (const record of guestSnapshot.history || []) {
        const res = await this.uploadSession(
          record,
          userId,
          "legacy_unverified",
        );
        if (res.success) {
          sessionsUploaded += 1;
        }
      }

      // 3. Read server achievements & cosmetics (unioned downward)
      const mergedAchievements = await this.syncAchievements(
        guestSnapshot.stats.unlockedAchievements || [],
        userId,
      );

      const mergedCosmetics = await this.syncCosmetics(
        guestSnapshot.cosmetics,
        userId,
      );

      // 4. Transfer guest dirty settings to user, then bidirectional settings sync
      await SettingsSyncManager.transferGuestDirtyFields(userId);
      const settingsRes = await this.syncSettings(
        guestSnapshot.settings,
        userId,
      );

      // 5. Update sync metadata
      await this.updateSyncMetadata(userId);

      return {
        success: true,
        sessionsUploaded,
        achievementsSynced: mergedAchievements.length,
        cosmeticsSynced: mergedCosmetics.unlockedAvatars.length,
        settingsMerged: settingsRes.synced,
        mergedSettings: settingsRes.settings,
        legacyImported,
      };
    } catch (err: any) {
      return {
        success: false,
        sessionsUploaded: 0,
        achievementsSynced: 0,
        cosmeticsSynced: 0,
        settingsMerged: false,
        legacyImported: false,
        error: err.message ?? "Migration failed.",
      };
    }
  }

  /**
   * Processes all pending items in the offline queue for the given authenticated user (SEC-06).
   * Fetches latest authoritative profile so local state stays in sync (SEC-12).
   */
  static async processQueue(userId: string): Promise<{
    processedCount: number;
    cloudProfile?: { level: number; xp: number; rank: string };
  }> {
    const eligible = await SyncQueueService.getEligibleItems(userId);
    let processedCount = 0;

    for (const item of eligible) {
      try {
        await SyncQueueService.markProcessing(item.id);

        if (item.type === "session") {
          const res = await this.uploadSession(item.payload, userId);
          if (res.success) {
            await SyncQueueService.remove(item.id);
            processedCount += 1;
          } else {
            await SyncQueueService.recordAttempt(item.id, res.error);
          }
        }
      } catch (err: any) {
        await SyncQueueService.recordAttempt(item.id, err.message);
      }
    }

    // Fetch authoritative cloud profile after queue flush (SEC-12)
    let cloudProfile:
      | { level: number; xp: number; rank: string }
      | undefined;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("level, xp, rank")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        cloudProfile = {
          level: data.level,
          xp: data.xp,
          rank: data.rank,
        };
      }
    } catch {
      // ignore
    }

    return { processedCount, cloudProfile };
  }

  /**
   * Updates sync metadata with timestamp and device info.
   */
  static async updateSyncMetadata(userId: string): Promise<void> {
    try {
      await supabase.from("sync_metadata").upsert(
        {
          user_id: userId,
          last_synced_at: new Date().toISOString(),
          schema_version: 2,
          device_platform: Platform.OS,
        },
        { onConflict: "user_id" },
      );
    } catch {
      // ignore
    }
  }

  /**
   * Performs a complete synchronization pass (SEC-05, SEC-06, SEC-12).
   */
  static async fullSync(
    currentState: AppStateV2,
    userId: string,
  ): Promise<SyncResult> {
    try {
      // 1. Flush offline queue scoped to active user
      const { processedCount: sessionsUploaded, cloudProfile } =
        await this.processQueue(userId);

      // 2. Bidirectional settings sync
      const { settings: mergedSettings } = await this.syncSettings(
        currentState.settings,
        userId,
      );

      // 3. Sync achievements (read-only from server)
      const mergedAchievements = await this.syncAchievements(
        currentState.stats.unlockedAchievements || [],
        userId,
      );

      // 4. Sync cosmetics (read-only from server)
      const mergedCosmetics = await this.syncCosmetics(
        currentState.cosmetics,
        userId,
      );

      // 5. Update metadata
      await this.updateSyncMetadata(userId);

      return {
        success: true,
        sessionsUploaded,
        settingsSynced: true,
        mergedSettings,
        achievementsSynced: mergedAchievements.length,
        cosmeticsSynced: mergedCosmetics.unlockedAvatars.length,
        cloudProfile,
      };
    } catch (err: any) {
      return {
        success: false,
        sessionsUploaded: 0,
        settingsSynced: false,
        achievementsSynced: 0,
        cosmeticsSynced: 0,
        error: err.message,
      };
    }
  }
}
