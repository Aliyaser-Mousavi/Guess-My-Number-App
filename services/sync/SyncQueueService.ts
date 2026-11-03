import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SyncQueueItem } from "@/types/sync";

const QUEUE_STORAGE_KEY = "@gmn/sync_queue";
const MAX_BACKOFF_MS = 60000; // 60 seconds max
const BASE_BACKOFF_MS = 2000; // 2 seconds base
const MAX_ATTEMPTS = 10;

export class SyncQueueService {
  /**
   * Enqueues an operation to be synchronized when online.
   */
  static async enqueue(
    type: SyncQueueItem["type"],
    payload: any,
  ): Promise<SyncQueueItem> {
    const queue = await this.getQueue();

    // Check for duplicate pending operations with identical payload key
    const payloadKey = payload.sessionId ?? payload.achievement_id ?? payload.id;
    if (payloadKey) {
      const existing = queue.find(
        (item) =>
          item.type === type &&
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
      type,
      payload,
      attempts: 0,
      createdAt: Date.now(),
    };

    queue.push(item);
    await this.saveQueue(queue);
    return item;
  }

  /**
   * Retrieves all items in the queue.
   */
  static async getQueue(): Promise<SyncQueueItem[]> {
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
  private static async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.warn("[SyncQueueService] Failed to save queue:", err);
    }
  }

  /**
   * Removes an item after successful sync.
   */
  static async remove(id: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await this.saveQueue(filtered);
  }

  /**
   * Records a failed synchronization attempt with exponential backoff.
   */
  static async recordAttempt(id: string, error?: string): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1) return;

    const item = queue[index];
    item.attempts += 1;
    item.lastAttemptAt = Date.now();
    item.error = error;

    if (item.attempts >= MAX_ATTEMPTS) {
      console.warn(
        `[SyncQueueService] Item ${id} reached max retry attempts (${MAX_ATTEMPTS}). Retaining in dead-letter state.`,
      );
    }

    await this.saveQueue(queue);
  }

  /**
   * Retrieves items eligible for retry based on exponential backoff.
   */
  static async getEligibleItems(): Promise<SyncQueueItem[]> {
    const queue = await this.getQueue();
    const now = Date.now();

    return queue.filter((item) => {
      if (item.attempts >= MAX_ATTEMPTS) return false;
      if (!item.lastAttemptAt) return true;

      const backoff = Math.min(
        MAX_BACKOFF_MS,
        BASE_BACKOFF_MS * Math.pow(2, item.attempts - 1),
      );
      return now - item.lastAttemptAt >= backoff;
    });
  }

  /**
   * Returns count of all pending operations.
   */
  static async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clears all items in the queue (e.g. during account switch).
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

