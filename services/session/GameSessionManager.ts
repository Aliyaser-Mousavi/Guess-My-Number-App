import type { DifficultyId, GameMode } from "../../constants/gameConfig";
import type {
  GameResult,
  GameSession,
  GuessFeedback,
  IndividualGuess,
} from "../../types/game";

export type CreateSessionParams = {
  mode: GameMode;
  difficultyId: DifficultyId;
  isDaily: boolean;
  targetNumber?: number;
  initialLives?: number;
};

export type CompleteSessionParams = {
  sessionId?: string;
  won: boolean;
  rounds: number;
  score: number;
  elapsedMs: number;
  secretNumber?: number;
  userNumber: number;
  isRanked?: boolean;
  isServerVerified?: boolean;
  ratingDelta?: number;
  newRating?: number;
  newTier?: string;
};

export class GameSessionManager {
  /**
   * Initializes a fresh game session with active lifecycle status.
   */
  static createSession(params: CreateSessionParams): GameSession {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sessionId = `sess_${timestamp}_${randomSuffix}`;

    return {
      sessionId,
      status: "active",
      mode: params.mode,
      difficulty: params.difficultyId,
      isDaily: params.isDaily,
      targetNumber: params.targetNumber,
      guesses: [],
      startedAt: timestamp,
      elapsedMs: 0,
      hintsUsed: 0,
      livesRemaining: params.initialLives,
    };
  }

  /**
   * Appends an individual guess to the active session.
   */
  static addGuess(
    session: GameSession,
    guess: number,
    feedback?: GuessFeedback,
  ): GameSession {
    if (session.status !== "active") {
      return session;
    }

    const timestamp = Date.now();
    const newGuess: IndividualGuess = {
      round: session.guesses.length + 1,
      guess,
      timestamp,
      feedback,
    };

    return {
      ...session,
      guesses: [...session.guesses, newGuess],
      elapsedMs: Math.max(session.elapsedMs, timestamp - session.startedAt),
    };
  }

  /**
   * Records a hint usage in the session.
   */
  static recordHintUsage(session: GameSession): GameSession {
    if (session.status !== "active") return session;
    return {
      ...session,
      hintsUsed: session.hintsUsed + 1,
    };
  }

  /**
   * Decrements remaining lives in Player Guess mode.
   */
  static decrementLives(session: GameSession): GameSession {
    if (session.status !== "active" || session.livesRemaining == null) {
      return session;
    }
    return {
      ...session,
      livesRemaining: Math.max(0, session.livesRemaining - 1),
    };
  }

  /**
   * Transitions an active session to completed status.
   * Guarantees duplicate-registration prevention.
   */
  static completeSession(
    session: GameSession,
    params: CompleteSessionParams,
  ): {
    session: GameSession;
    isDuplicate: boolean;
    result: GameResult;
  } {
    // If the session has already been completed, block duplicate recording
    if (session.status === "completed" && session.result) {
      return {
        session,
        isDuplicate: true,
        result: session.result,
      };
    }

    const endedAt = Date.now();
    const elapsedMs = Math.max(params.elapsedMs, endedAt - session.startedAt);

    const result: GameResult = {
      sessionId: params.sessionId || session.sessionId,
      won: params.won,
      rounds: params.rounds,
      userNumber: params.userNumber,
      secretNumber: params.secretNumber,
      score: params.score,
      elapsedMs,
      mode: session.mode,
      difficulty: session.difficulty,
      hintsUsed: session.hintsUsed,
      isDaily: session.isDaily,
      guesses: session.guesses.map((g) => g.guess),
      isRanked: params.isRanked,
      isServerVerified: params.isServerVerified,
      ratingDelta: params.ratingDelta,
      newRating: params.newRating,
      newTier: params.newTier,
    };

    const completedSession: GameSession = {
      ...session,
      status: "completed",
      endedAt,
      elapsedMs,
      result,
    };

    return {
      session: completedSession,
      isDuplicate: false,
      result,
    };
  }

  /**
   * Transitions an active session to abandoned status when quitting.
   */
  static abandonSession(session: GameSession): GameSession {
    if (session.status !== "active") {
      return session;
    }

    const endedAt = Date.now();
    return {
      ...session,
      status: "abandoned",
      endedAt,
      elapsedMs: endedAt - session.startedAt,
    };
  }
}
