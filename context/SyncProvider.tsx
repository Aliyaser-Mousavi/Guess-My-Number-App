import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import { supabase } from "@/lib/supabase";
import { AuthService } from "@/services/auth/AuthService";
import { CloudSyncService } from "@/services/sync/CloudSyncService";
import { SyncQueueService } from "@/services/sync/SyncQueueService";
import { SettingsSyncManager } from "@/services/sync/SettingsSyncManager";
import type { SyncStatus } from "@/types/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

const LAST_SYNCED_STORAGE_KEY = "@gmn/last_synced_at";

export type SyncContextValue = {
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  pendingCount: number;
  failedCount: number;
  isOnline: boolean;
  manualSync: () => Promise<boolean>;
  retryFailed: () => Promise<number>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const { appState, ready, applyCloudSync } = useGame();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const isSyncingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Restore cached lastSyncedAt timestamp on startup & refresh queue counts
  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNCED_STORAGE_KEY)
      .then((val) => {
        if (val) setLastSyncedAt(val);
      })
      .catch(() => {});

    SyncQueueService.getPendingCount(user?.id)
      .then((count) => setPendingCount(count))
      .catch(() => {});

    SyncQueueService.getFailedCount(user?.id)
      .then((count) => setFailedCount(count))
      .catch(() => {});
  }, [user?.id]);

  /**
   * Probes connectivity gracefully without third-party native modules.
   */
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      "onLine" in navigator
    ) {
      if (!navigator.onLine) return false;
    }

    try {
      // Lightweight, non-throwing ping to Supabase profiles
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (
        error &&
        (error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("Network request failed") ||
          error.message.includes("Failed to fetch"))
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Executes a complete two-way synchronization pass.
   */
  const performSync = useCallback(async (): Promise<boolean> => {
    if (isSyncingRef.current) return false;

    // Refresh pending & failed counts scoped to user
    const [pCount, fCount] = await Promise.all([
      SyncQueueService.getPendingCount(user?.id),
      SyncQueueService.getFailedCount(user?.id),
    ]);
    setPendingCount(pCount);
    setFailedCount(fCount);

    if (!user?.id) {
      setSyncStatus(pCount > 0 ? "pending" : "idle");
      return true;
    }

    isSyncingRef.current = true;
    setSyncStatus("syncing");

    try {
      const online = await checkConnectivity();
      setIsOnline(online);

      if (!online) {
        setSyncStatus("offline");
        isSyncingRef.current = false;
        return false;
      }

      // 1. Full bidirectional sync (SEC-05, SEC-06, SEC-12)
      const fullRes = await CloudSyncService.fullSync(appState, user.id);

      // 2. Fetch remote cloud match history
      const cloudHistory = await CloudSyncService.fetchCloudSessions(
        user.id,
        50,
        0,
      );

      // 3. Apply merged data into local application state
      applyCloudSync({
        settings: fullRes.mergedSettings,
        cloudProfile: fullRes.cloudProfile,
        cloudHistory,
      });

      // 4. Update sync metadata timestamp
      const nowIso = new Date().toISOString();
      setLastSyncedAt(nowIso);
      await AsyncStorage.setItem(LAST_SYNCED_STORAGE_KEY, nowIso);

      const [nextPending, nextFailed] = await Promise.all([
        SyncQueueService.getPendingCount(user.id),
        SyncQueueService.getFailedCount(user.id),
      ]);
      setPendingCount(nextPending);
      setFailedCount(nextFailed);

      if (fullRes.success) {
        setSyncStatus(nextPending > 0 ? "pending" : "up_to_date");
        return true;
      } else {
        setSyncStatus("failed");
        return false;
      }
    } catch (err) {
      console.warn("[SyncProvider] performSync error:", err);
      setSyncStatus("failed");
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [user, checkConnectivity, appState, applyCloudSync]);

  /**
   * Manually retries all failed items.
   */
  const retryFailed = useCallback(async (): Promise<number> => {
    const reset = await SyncQueueService.retryFailedItems(user?.id);
    const [pCount, fCount] = await Promise.all([
      SyncQueueService.getPendingCount(user?.id),
      SyncQueueService.getFailedCount(user?.id),
    ]);
    setPendingCount(pCount);
    setFailedCount(fCount);
    if (reset > 0) {
      performSync().catch(() => {});
    }
    return reset;
  }, [user?.id, performSync]);

  /**
   * Handles user authentication transitions and automatic guest migration (SEC-04 & SEC-09).
   */
  useEffect(() => {
    if (!ready) return;

    const prevId = prevUserIdRef.current;
    const currentId = user?.id ?? null;
    prevUserIdRef.current = currentId;

    if (currentId && !prevId) {
      // User just authenticated! Perform guest-to-account migration
      (async () => {
        isSyncingRef.current = true;
        setSyncStatus("syncing");

        try {
          const migRes = await CloudSyncService.migrateGuestToAccount(
            appState,
            currentId,
          );

          if (migRes.success) {
            const [sessions, dbProf] = await Promise.all([
              CloudSyncService.fetchCloudSessions(currentId),
              AuthService.fetchProfile(currentId),
            ]);

            applyCloudSync({
              settings: migRes.mergedSettings,
              cloudHistory: sessions,
              cloudProfile: dbProf
                ? {
                    level: dbProf.level,
                    xp: dbProf.xp,
                    rank: dbProf.rank,
                  }
                : undefined,
            });

            await refreshProfile();

            const nowIso = new Date().toISOString();
            setLastSyncedAt(nowIso);
            await AsyncStorage.setItem(LAST_SYNCED_STORAGE_KEY, nowIso);

            const [nextPending, nextFailed] = await Promise.all([
              SyncQueueService.getPendingCount(currentId),
              SyncQueueService.getFailedCount(currentId),
            ]);
            setPendingCount(nextPending);
            setFailedCount(nextFailed);
            setSyncStatus("up_to_date");
          } else {
            console.warn(
              "[SyncProvider] Guest migration failed:",
              migRes.error,
            );
            setSyncStatus("failed");
          }
        } catch (err) {
          console.error("[SyncProvider] Migration exception:", err);
          setSyncStatus("failed");
        } finally {
          isSyncingRef.current = false;
        }
      })();
    } else if (currentId && prevId && currentId !== prevId) {
      // Direct account switch: trigger fresh sync for the new user account
      performSync().catch(() => {});
    } else if (!currentId && prevId) {
      // User signed out: reset status and clean up guest dirty settings
      setSyncStatus("idle");
      SettingsSyncManager.clearAllDirty("guest").catch(() => {});
    }
  }, [user?.id, ready, appState, applyCloudSync, refreshProfile, performSync]);

  /**
   * Trigger automatic synchronization when app returns to foreground.
   */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && user?.id) {
        performSync().catch(() => {});
      }
    });

    return () => {
      sub.remove();
    };
  }, [user?.id, performSync]);

  /**
   * Periodic queue processing for retry backoff, scoped strictly to user (SEC-06 & SEC-12).
   */
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      const [pending, failed] = await Promise.all([
        SyncQueueService.getPendingCount(user.id),
        SyncQueueService.getFailedCount(user.id),
      ]);
      setPendingCount(pending);
      setFailedCount(failed);

      if (pending > 0 && !isSyncingRef.current) {
        const eligible = await SyncQueueService.getEligibleItems(user.id);
        if (eligible.length > 0) {
          // Process queue and update local state with returned cloud profile (SEC-12)
          const { cloudProfile } = await CloudSyncService.processQueue(
            user.id,
          );
          if (cloudProfile) {
            applyCloudSync({ cloudProfile });
          }

          const nextCount = await SyncQueueService.getPendingCount(user.id);
          setPendingCount(nextCount);
          if (nextCount === 0 && syncStatus !== "syncing") {
            setSyncStatus("up_to_date");
          }
        }
      }
    }, 15000); // 15 second cycle

    return () => clearInterval(interval);
  }, [user?.id, syncStatus, applyCloudSync]);

  const value = useMemo(
    () => ({
      syncStatus,
      lastSyncedAt,
      pendingCount,
      failedCount,
      isOnline,
      manualSync: performSync,
      retryFailed,
    }),
    [
      syncStatus,
      lastSyncedAt,
      pendingCount,
      failedCount,
      isOnline,
      performSync,
      retryFailed,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
