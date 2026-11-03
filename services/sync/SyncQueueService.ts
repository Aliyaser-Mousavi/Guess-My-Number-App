import type { SyncQueueItem } from "@/types/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_STORAGE_KEY = "@gmn/sync_queue";
const MAX_BACKOFF_MS = 60000; // 60 seconds max
const BASE_BACKOFF_MS = 2000; // 2 seconds base
const MAX_ATTEMPTS = 10;

/**
 * In-memory serialization mutex to prevent concurrent AsyncStorage race conditions.
 */
let queueLock: Promise<void> = Promise.resolve();

function withLock<T>(action: () => Promise<T>): Promise<T> {
  const next = queueLock.then(action, action);
  queueLock = next.then(
    () => {},
    () => {},
  );
  return next;
}

export class SyncQueueService {
  /**
   * Enqueues an operation with strict account attribution (SEC-06).
   */
  static async enqueue(
    type: SyncQueueItem["type"],
    payload: any,
    userId?: string | null,
  ): Promise<SyncQueueItem> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      const ownerType = userId ? "authenticated" : "guest";

      // Check for duplicate pending operations with identical payload key & owner
      const payloadKey =
        payload.sessionId ?? payload.achievement_id ?? payload.id;
      if (payloadKey) {
        const existing = queue.find(
          (item) =>
            item.type === type &&
            item.userId === (userId ?? null) &&
            item.ownerType === ownerType &&
            (item.payload.sessionId === payloadKey ||
              item.payload.achievement_id === payloadKey ||
              item.payload.id === payloadKey),
        );
        if (existing) {
          return existing;
        }
      }

      const item: SyncQueueItem = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ownerType,
        userId: userId ?? null,
        status: "pending",
        type,
        payload,
        attempts: 0,
        createdAt: Date.now(),
      };

      queue.push(item);
      await this.saveQueueToStorage(queue);
      return item;
    });
  }

  /**
   * Retrieves all items in the queue from storage.
   */
  private static async readQueueFromStorage(): Promise<SyncQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SyncQueueItem[];
    } catch {
      return [];
    }
  }

  /**
   * Saves the queue to storage.
   */
  private static async saveQueueToStorage(
    queue: SyncQueueItem[],
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn("[SyncQueueService] Failed to save queue:", err);
    }
  }

  /**
   * Retrieves all raw items in the queue (for diagnostic inspections).
   */
  static async getQueue(): Promise<SyncQueueItem[]> {
    return this.readQueueFromStorage();
  }

  /**
   * Removes an item after successful sync.
   */
  static async remove(id: string): Promise<void> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      const filtered = queue.filter((item) => item.id !== id);
      await this.saveQueueToStorage(filtered);
    });
  }

  /**
   * Marks an item as actively processing.
   */
  static async markProcessing(id: string): Promise<void> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      const index = queue.findIndex((item) => item.id === id);
      if (index === -1) return;
      queue[index].status = "processing";
      await this.saveQueueToStorage(queue);
    });
  }

  /**
   * Records a failed synchronization attempt with exponential backoff.
   * Enforces explicit dead-letter state when max attempts are exceeded (SEC-11).
   */
  static async recordAttempt(id: string, error?: string): Promise<void> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      const index = queue.findIndex((item) => item.id === id);
      if (index === -1) return;

      const item = queue[index];
      item.attempts += 1;
      item.lastAttemptAt = Date.now();
      item.error = error;

      if (item.attempts >= MAX_ATTEMPTS) {
        item.status = "failed_permanent";
        console.warn(
          `[SyncQueueService] Item ${id} reached max retry attempts (${MAX_ATTEMPTS}). Moved to failed_permanent state.`,
        );
      } else {
        item.status = "retry_wait";
      }

      await this.saveQueueToStorage(queue);
    });
  }

  /**
   * Retrieves items eligible for retry based on exponential backoff,
   * strictly scoped to the active account context (SEC-06).
   */
  static async getEligibleItems(
    userId?: string | null,
  ): Promise<SyncQueueItem[]> {
    const queue = await this.readQueueFromStorage();
    const now = Date.now();

    return queue.filter((item) => {
      // 1. Account attribution filter: Never upload User A's items to User B!
      if (userId) {
        if (item.ownerType !== "authenticated" || item.userId !== userId) {
          return false;
        }
      } else {
        if (item.ownerType !== "guest") {
          return false;
        }
      }

      // 2. Status filter: Exclude permanently failed items
      if (item.status === "failed_permanent" || item.attempts >= MAX_ATTEMPTS) {
        return false;
      }

      // 3. In-flight guard
      if (item.status === "processing") {
        // If stuck in processing for more than 2 minutes, allow retry
        if (item.lastAttemptAt && now - item.lastAttemptAt < 120000) {
          return false;
        }
      }

      // 4. Backoff timing
      if (!item.lastAttemptAt) return true;

      const backoff = Math.min(
        MAX_BACKOFF_MS,
        BASE_BACKOFF_MS * Math.pow(2, item.attempts - 1),
      );
      return now - item.lastAttemptAt >= backoff;
    });
  }

  /**
   * Returns count of active pending operations for the given user (excluding dead-letter).
   */
  static async getPendingCount(userId?: string | null): Promise<number> {
    const queue = await this.readQueueFromStorage();
    return queue.filter((item) => {
      if (userId) {
        if (item.ownerType !== "authenticated" || item.userId !== userId)
          return false;
      } else {
        if (item.ownerType !== "guest") return false;
      }
      return (
        item.status === "pending" ||
        item.status === "retry_wait" ||
        item.status === "processing"
      );
    }).length;
  }

  /**
   * Returns count of permanently failed (dead-letter) items for the given user.
   */
  static async getFailedCount(userId?: string | null): Promise<number> {
    const queue = await this.readQueueFromStorage();
    return queue.filter((item) => {
      if (userId) {
        if (item.ownerType !== "authenticated" || item.userId !== userId)
          return false;
      } else {
        if (item.ownerType !== "guest") return false;
      }
      return item.status === "failed_permanent";
    }).length;
  }

  /**
   * Manually resets all failed items back to pending state for user-driven retry.
   */
  static async retryFailedItems(userId?: string | null): Promise<number> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      let resetCount = 0;

      for (const item of queue) {
        const matchesUser = userId
          ? item.ownerType === "authenticated" && item.userId === userId
          : item.ownerType === "guest";

        if (matchesUser && item.status === "failed_permanent") {
          item.status = "pending";
          item.attempts = 0;
          item.lastAttemptAt = undefined;
          item.error = undefined;
          resetCount += 1;
        }
      }

      if (resetCount > 0) {
        await this.saveQueueToStorage(queue);
      }
      return resetCount;
    });
  }

  /**
   * Clears only permanently failed items for the given user context.
   */
  static async clearFailedItems(userId?: string | null): Promise<void> {
    return withLock(async () => {
      const queue = await this.readQueueFromStorage();
      const filtered = queue.filter((item) => {
        const matchesUser = userId
          ? item.ownerType === "authenticated" && item.userId === userId
          : item.ownerType === "guest";
        return !(matchesUser && item.status === "failed_permanent");
      });
      await this.saveQueueToStorage(filtered);
    });
  }

  /**
   * Clears all items in the queue (e.g. during debug or full reset).
   */
  static async clear(): Promise<void> {
    return withLock(async () => {
      try {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
      } catch {
        // ignore
      }
    });
  }
}
