import { useAuth } from "@/context/AuthProvider";
import { useGame } from "@/context/GameProvider";
import { supabase } from "@/lib/supabase";
import { AuthService } from "@/services/auth/AuthService";
import { CloudSyncService } from "@/services/sync/CloudSyncService";
import { SyncQueueService } from "@/services/sync/SyncQueueService";
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
  isOnline: boolean;
  manualSync: () => Promise<boolean>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshProfile } = useAuth();
  const { appState, ready, applyCloudSync } = useGame();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const isSyncingRef = useRef(false);
  const prevUserIdRef = useRef<string | null>(null);

  // Restore cached lastSyncedAt timestamp on startup
  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNCED_STORAGE_KEY)
      .then((val) => {
        if (val) setLastSyncedAt(val);
      })
      .catch(() => {});

    SyncQueueService.getPendingCount()
      .then((count) => setPendingCount(count))
      .catch(() => {});
  }, []);

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

    // Refresh pending count
    const count = await SyncQueueService.getPendingCount();
    setPendingCount(count);

    if (!user?.id) {
      setSyncStatus(count > 0 ? "pending" : "idle");
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

      // 1. Full bidirectional sync
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

      const nextPending = await SyncQueueService.getPendingCount();
      setPendingCount(nextPending);

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
   * Handles user authentication transitions and automatic guest migration.
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

            const nextPending = await SyncQueueService.getPendingCount();
            setPendingCount(nextPending);
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
    } else if (!currentId && prevId) {
      // User signed out
      setSyncStatus("idle");
    }
  }, [user?.id, ready, appState, applyCloudSync, refreshProfile]);

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
   * Periodic queue processing for retry backoff.
   */
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      const pending = await SyncQueueService.getPendingCount();
      setPendingCount(pending);

      if (pending > 0 && !isSyncingRef.current) {
        const eligible = await SyncQueueService.getEligibleItems();
        if (eligible.length > 0) {
          await CloudSyncService.processQueue(user.id);
          const nextCount = await SyncQueueService.getPendingCount();
          setPendingCount(nextCount);
          if (nextCount === 0 && syncStatus !== "syncing") {
            setSyncStatus("up_to_date");
          }
        }
      }
    }, 15000); // 15 second cycle

    return () => clearInterval(interval);
  }, [user?.id, syncStatus]);

  const value = useMemo(
    () => ({
      syncStatus,
      lastSyncedAt,
      pendingCount,
      isOnline,
      manualSync: performSync,
    }),
    [syncStatus, lastSyncedAt, pendingCount, isOnline, performSync],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
}
