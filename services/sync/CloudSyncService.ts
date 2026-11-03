import { supabase } from "@/lib/supabase";
import type {
  AppStateV2,
  CosmeticsState,
  GameHistoryRecord,
  Settings,
} from "@/types/game";
import type {
  CloudRewardResult,
  GuestMigrationResult,
  SyncResult,
} from "@/types/sync";
import { Platform } from "react-native";
import { SyncQueueService } from "./SyncQueueService";

export class CloudSyncService {
  /**
   * Uploads an individual game history record and executes server-authoritative reward processing.
   */
  static async uploadSession(
    record: GameHistoryRecord,
    userId: string,
  ): Promise<{ success: boolean; reward?: CloudRewardResult; error?: string }> {
    try {
      // 1. Map client record to game_sessions table columns
      const sessionPayload = {
        user_id: userId,
        client_session_id: record.sessionId || record.id,
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
        played_at: new Date(record.timestamp || Date.now()).toISOString(),
      };

      // 2. Insert into game_sessions (idempotent ON CONFLICT ignore)
      const { data: inserted, error: insertError } = await supabase
        .from("game_sessions")
        .upsert(sessionPayload, { onConflict: "user_id,client_session_id" })
        .select("id")
        .single();

      if (insertError) {
        // If already exists, query its ID to allow reward check
        if (insertError.code === "23505") {
          const { data: existing } = await supabase
            .from("game_sessions")
            .select("id")
            .eq("user_id", userId)
            .eq("client_session_id", sessionPayload.client_session_id)
            .maybeSingle();

          if (existing?.id) {
            return this.executeRewardProcess(existing.id);
          }
        }
        return { success: false, error: insertError.message };
      }

      if (!inserted?.id) {
        return { success: false, error: "Failed to persist game session record." };
      }

      // 3. Process rewards server-side
      return this.executeRewardProcess(inserted.id);
    } catch (err: any) {
      return { success: false, error: err.message ?? "Failed to upload session." };
    }
  }

  /**
   * Calls the server RPC process_game_session_reward.
   */
  private static async executeRewardProcess(
    sessionId: string,
  ): Promise<{ success: boolean; reward?: CloudRewardResult; error?: string }> {
    try {
      const { data, error } = await supabase.rpc(
        "process_game_session_reward",
        { p_session_id: sessionId },
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, reward: data as CloudRewardResult };
    } catch (err: any) {
      return { success: false, error: err.message };
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
        .order("played_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: `cloud_${row.id}`,
        sessionId: row.client_session_id,
        timestamp: new Date(row.played_at).getTime(),
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
   * Synchronizes user preferences with bidirectional field-level merge.
   */
  static async syncSettings(
    localSettings: Settings,
    userId: string,
  ): Promise<{ settings: Settings; synced: boolean }> {
    try {
      const { data: cloudRow } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!cloudRow) {
        // Upload local settings to cloud
        await supabase.from("user_settings").insert({
          user_id: userId,
          theme_id: localSettings.themeId,
          number_style: localSettings.numberStyle,
          number_animation: localSettings.numberAnimation,
          text_size: localSettings.textSize,
          haptics: localSettings.haptics,
          haptic_intensity: localSettings.hapticIntensity,
          sound_enabled: localSettings.soundEnabled,
          sound_volume: localSettings.soundVolume,
          show_proximity: localSettings.showProximity,
          show_timer: localSettings.showTimer,
          show_range_bar: localSettings.showRangeBar,
          tutorial_completed: localSettings.tutorialCompleted,
          high_contrast: localSettings.highContrast,
          color_blind_mode: localSettings.colorBlindMode,
          reduced_motion: localSettings.reducedMotion,
          left_handed_controls: localSettings.leftHandedControls,
          language: localSettings.language,
          digit_format: localSettings.digitFormat,
          notifications: localSettings.notifications,
          version: 1,
        });
        return { settings: localSettings, synced: true };
      }

      // Merge: preserve cloud settings if present
      const merged: Settings = {
        ...localSettings,
        themeId: (cloudRow.theme_id as any) ?? localSettings.themeId,
        numberStyle: (cloudRow.number_style as any) ?? localSettings.numberStyle,
        numberAnimation:
          (cloudRow.number_animation as any) ?? localSettings.numberAnimation,
        textSize: (cloudRow.text_size as any) ?? localSettings.textSize,
        haptics: cloudRow.haptics ?? localSettings.haptics,
        hapticIntensity:
          (cloudRow.haptic_intensity as any) ?? localSettings.hapticIntensity,
        soundEnabled: cloudRow.sound_enabled ?? localSettings.soundEnabled,
        soundVolume: cloudRow.sound_volume ?? localSettings.soundVolume,
        showProximity: cloudRow.show_proximity ?? localSettings.showProximity,
        showTimer: cloudRow.show_timer ?? localSettings.showTimer,
        showRangeBar: cloudRow.show_range_bar ?? localSettings.showRangeBar,
        tutorialCompleted:
          cloudRow.tutorial_completed || localSettings.tutorialCompleted,
        highContrast: cloudRow.high_contrast ?? localSettings.highContrast,
        colorBlindMode:
          (cloudRow.color_blind_mode as any) ?? localSettings.colorBlindMode,
        reducedMotion: cloudRow.reduced_motion ?? localSettings.reducedMotion,
        leftHandedControls:
          cloudRow.left_handed_controls ?? localSettings.leftHandedControls,
        language: (cloudRow.language as any) ?? localSettings.language,
        digitFormat:
          (cloudRow.digit_format as any) ?? localSettings.digitFormat,
        notifications: cloudRow.notifications ?? localSettings.notifications,
      };

      return { settings: merged, synced: true };
    } catch {
      return { settings: localSettings, synced: false };
    }
  }

  /**
   * Synchronizes achievements via set union.
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
      const unionSet = new Set([...localUnlocked, ...cloudSet]);

      // Upload local unlocks missing from cloud
      const missingOnCloud = localUnlocked.filter((id) => !cloudSet.has(id));
      if (missingOnCloud.length > 0) {
        const rows = missingOnCloud.map((achId) => ({
          user_id: userId,
          achievement_id: achId,
          unlock_source: "offline_sync",
        }));
        await supabase.from("user_achievements").upsert(rows, {
          onConflict: "user_id,achievement_id",
        });
      }

      return Array.from(unionSet);
    } catch {
      return localUnlocked;
    }
  }

  /**
   * Synchronizes cosmetic unlocks with server inventory.
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
   * Performs seamless guest-to-account data migration upon signup/login.
   */
  static async migrateGuestToAccount(
    guestSnapshot: AppStateV2,
    userId: string,
  ): Promise<GuestMigrationResult> {
    try {
      let legacyImported = false;

      // 1. One-time legacy progress snapshot
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
            unlocked_achievements: guestSnapshot.stats.unlockedAchievements || [],
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

      // 2. Upload local game history sessions
      let sessionsUploaded = 0;
      for (const record of guestSnapshot.history || []) {
        const res = await this.uploadSession(record, userId);
        if (res.success) {
          sessionsUploaded += 1;
        }
      }

      // 3. Sync achievements & cosmetics
      const mergedAchievements = await this.syncAchievements(
        guestSnapshot.stats.unlockedAchievements || [],
        userId,
      );

      const mergedCosmetics = await this.syncCosmetics(
        guestSnapshot.cosmetics,
        userId,
      );

      // 4. Sync settings
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
   * Processes all pending items in the offline queue.
   */
  static async processQueue(userId: string): Promise<number> {
    const eligible = await SyncQueueService.getEligibleItems();
    let processedCount = 0;

    for (const item of eligible) {
      try {
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

    return processedCount;
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
   * Performs an incremental synchronization pass.
   */
  static async fullSync(
    currentState: AppStateV2,
    userId: string,
  ): Promise<SyncResult> {
    try {
      // 1. Flush offline queue
      const sessionsUploaded = await this.processQueue(userId);

      // 2. Sync settings
      const { settings: mergedSettings } = await this.syncSettings(
        currentState.settings,
        userId,
      );

      // 3. Sync achievements
      const mergedAchievements = await this.syncAchievements(
        currentState.stats.unlockedAchievements || [],
        userId,
      );

      // 4. Sync cosmetics
      const mergedCosmetics = await this.syncCosmetics(
        currentState.cosmetics,
        userId,
      );

      // 5. Fetch server-authoritative profile
      const { data: cloudProfile } = await supabase
        .from("profiles")
        .select("level, xp, rank")
        .eq("id", userId)
        .maybeSingle();

      // 6. Record metadata
      await this.updateSyncMetadata(userId);

      return {
        success: true,
        sessionsUploaded,
        settingsSynced: true,
        mergedSettings,
        achievementsSynced: mergedAchievements.length,
        cosmeticsSynced: mergedCosmetics.unlockedAvatars.length,
        cloudProfile: cloudProfile
          ? {
              level: cloudProfile.level,
              xp: cloudProfile.xp,
              rank: cloudProfile.rank,
            }
          : undefined,
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
