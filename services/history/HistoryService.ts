import {
  getDifficulty,
  type DifficultyId,
  type GameMode,
} from "@/constants/gameConfig";
import type {
  GameHistoryRecord,
  GameReplayEvent,
  GameResult,
  GuessFeedback,
  CustomGameConfig,
} from "../../types/game";

export type HistoryFilterOptions = {
  mode?: GameMode | "all";
  result?: "all" | "won" | "lost";
  difficulty?: DifficultyId | "all";
  dateRange?: "all" | "today" | "week" | "month";
  startDate?: number;
  endDate?: number;
};

export type PaginationResult = {
  items: GameHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

export type CreateRecordOptions = {
  minRange?: number;
  maxRange?: number;
  customConfig?: CustomGameConfig;
  player1Name?: string;
  player2Name?: string;
};

export class HistoryService {
  /**
   * Generates a persistable history record from a game result.
   */
  static createRecord(
    result: GameResult,
    options?: CreateRecordOptions,
  ): GameHistoryRecord {
    const timestamp = Date.now();
    const id = `hist_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;
    const diff = getDifficulty(result.difficulty);

    const minRange =
      options?.minRange ?? options?.customConfig?.min ?? diff.min;
    const maxRange =
      options?.maxRange ?? options?.customConfig?.max ?? diff.max;

    const record: GameHistoryRecord = {
      id,
      sessionId: result.sessionId ?? `sess_${timestamp}`,
      timestamp,
      won: result.won,
      rounds: result.rounds,
      score: result.score,
      elapsedMs: result.elapsedMs,
      mode: result.mode,
      difficulty: result.difficulty,
      hintsUsed: result.hintsUsed,
      isDaily: result.isDaily,
      guesses: [...result.guesses],
      secretNumber: result.secretNumber,
      userNumber: result.userNumber,
      minRange,
      maxRange,
      targetNumber: result.secretNumber ?? result.userNumber,
      customConfig: options?.customConfig,
      player1Name: options?.player1Name,
      player2Name: options?.player2Name,
    };

    // Reconstruct timeline immediately so it is permanently cached
    record.timeline = HistoryService.reconstructTimeline(record);

    return record;
  }

  /**
   * Appends a new record to history, maintaining a generous recent log (up to 1,000 matches).
   */
  static appendRecord(
    history: GameHistoryRecord[],
    newRecord: GameHistoryRecord,
    maxItems = 1000,
  ): GameHistoryRecord[] {
    // Avoid duplicate records if sessionId already exists
    if (history.some((h) => h.sessionId === newRecord.sessionId)) {
      return history;
    }
    return [newRecord, ...history].slice(0, maxItems);
  }

  /**
   * Reconstructs the step-by-step game events (guesses, range narrowing, feedback, hints)
   * deterministically from stored historical data.
   */
  static reconstructTimeline(record: GameHistoryRecord): GameReplayEvent[] {
    const diff = getDifficulty(record.difficulty);
    let low = record.minRange ?? record.customConfig?.min ?? diff.min;
    let high = record.maxRange ?? record.customConfig?.max ?? diff.max;
    const target = record.targetNumber ?? record.secretNumber ?? record.userNumber;

    const events: GameReplayEvent[] = [];
    const guessCount = record.guesses.length;

    // Distribute hints across the first half of attempts if hints were used
    const hintStep = record.hintsUsed > 0 ? Math.max(1, Math.floor(guessCount / 2)) : -1;

    for (let i = 0; i < guessCount; i++) {
      const g = record.guesses[i];
      let feedback: GuessFeedback = "correct";

      if (g < target) {
        feedback = "low";
        low = Math.max(low, g + 1);
      } else if (g > target) {
        feedback = "high";
        high = Math.min(high, g - 1);
      } else {
        feedback = "correct";
      }

      // If user utilized a hint before this guess
      if (i === hintStep && record.hintsUsed > 0) {
        events.push({
          step: events.length + 1,
          type: "hint",
          hintDescription: `${target % 2 === 0 ? "Even" : "Odd"} number hint used`,
          minAfter: low,
          maxAfter: high,
        });
      }

      events.push({
        step: events.length + 1,
        type: "guess",
        guess: g,
        feedback,
        minAfter: low,
        maxAfter: high,
      });
    }

    return events;
  }

  /**
   * Filters history based on mode, outcome, difficulty, and date bounds.
   */
  static filterHistory(
    records: GameHistoryRecord[],
    filters: HistoryFilterOptions,
  ): GameHistoryRecord[] {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    return records.filter((rec) => {
      // Filter by mode
      if (filters.mode && filters.mode !== "all" && rec.mode !== filters.mode) {
        return false;
      }

      // Filter by result
      if (filters.result === "won" && !rec.won) return false;
      if (filters.result === "lost" && rec.won) return false;

      // Filter by difficulty
      if (
        filters.difficulty &&
        filters.difficulty !== "all" &&
        rec.difficulty !== filters.difficulty
      ) {
        return false;
      }

      // Filter by date range
      if (filters.dateRange === "today" && now - rec.timestamp > oneDay) {
        return false;
      }
      if (filters.dateRange === "week" && now - rec.timestamp > oneWeek) {
        return false;
      }
      if (filters.dateRange === "month" && now - rec.timestamp > oneMonth) {
        return false;
      }
      if (filters.startDate && rec.timestamp < filters.startDate) {
        return false;
      }
      if (filters.endDate && rec.timestamp > filters.endDate) {
        return false;
      }

      return true;
    });
  }

  /**
   * Paginates history records for smooth, scalable scrolling.
   */
  static paginateHistory(
    records: GameHistoryRecord[],
    page = 1,
    pageSize = 10,
  ): PaginationResult {
    const safePage = Math.max(1, page);
    const total = records.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const offset = (safePage - 1) * pageSize;
    const items = records.slice(offset, offset + pageSize);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      totalPages,
      hasMore: safePage < totalPages,
    };
  }
}
