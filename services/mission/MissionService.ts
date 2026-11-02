import { seededRandom } from "@/constants/gameConfig";
import type {
  GameResult,
  MissionProgress,
  MissionReward,
  PlayerStats,
} from "../../types/game";

export class MissionService {
  /**
   * Generates or refreshes Daily and Weekly missions deterministically.
   * Preserves existing progress for unexpired missions.
   */
  static generateMissions(
    existingMissions: MissionProgress[],
    now = Date.now(),
  ): MissionProgress[] {
    const d = new Date(now);

    // Compute Daily expiration: tonight at 23:59:59.999
    const endOfDay = new Date(d);
    endOfDay.setHours(23, 59, 59, 999);
    const dailyExpiresAt = endOfDay.getTime();
    const dailySeed = `daily-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    // Compute Weekly expiration: next Sunday at 23:59:59.999
    const endOfWeek = new Date(d);
    const dayOfWeek = endOfWeek.getDay(); // 0 is Sunday
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);
    const weeklyExpiresAt = endOfWeek.getTime();
    const weekNumber = Math.ceil(
      (now - new Date(d.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
    const weeklySeed = `weekly-${d.getFullYear()}-w${weekNumber}`;

    // Filter unexpired existing missions
    const activeDaily = existingMissions.filter(
      (m) => m.category === "daily" && m.expiresAt > now,
    );
    const activeWeekly = existingMissions.filter(
      (m) => m.category === "weekly" && m.expiresAt > now,
    );

    const result: MissionProgress[] = [];

    // Daily Missions Pool
    if (activeDaily.length >= 3) {
      result.push(...activeDaily);
    } else {
      const dailyPool = [
        {
          type: "win_games" as const,
          title: "Daily Contender",
          description: "Win 2 games in any game mode",
          target: 2,
          reward: { xp: 220 },
          icon: "trophy",
        },
        {
          type: "speed_win" as const,
          title: "Rapid Intuition",
          description: "Win a match in under 30 seconds",
          target: 1,
          reward: { xp: 260 },
          icon: "flash",
        },
        {
          type: "hintless_win" as const,
          title: "Pure Perception",
          description: "Win a match without using hints",
          target: 1,
          reward: { xp: 240 },
          icon: "eye-off",
        },
        {
          type: "daily_challenge" as const,
          title: "Daily Solved",
          description: "Complete today's Daily Puzzle",
          target: 1,
          reward: { xp: 300 },
          icon: "calendar",
        },
        {
          type: "score_points" as const,
          title: "Score Accumulator",
          description: "Accumulate 1,200 points in matches",
          target: 1200,
          reward: { xp: 250 },
          icon: "star",
        },
        {
          type: "hard_expert_win" as const,
          title: "High Stakes",
          description: "Win a match on Hard or Expert",
          target: 1,
          reward: { xp: 320 },
          icon: "skull",
        },
      ];

      // Deterministically pick 3 distinct daily missions
      const pickedDaily: MissionProgress[] = [];
      const rand1 = Math.floor(seededRandom(dailySeed + "-1") * dailyPool.length);
      pickedDaily.push({
        id: `${dailySeed}-m1`,
        category: "daily",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: dailyExpiresAt,
        ...dailyPool[rand1],
      });

      let rand2 = Math.floor(seededRandom(dailySeed + "-2") * dailyPool.length);
      if (rand2 === rand1) rand2 = (rand2 + 1) % dailyPool.length;
      pickedDaily.push({
        id: `${dailySeed}-m2`,
        category: "daily",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: dailyExpiresAt,
        ...dailyPool[rand2],
      });

      let rand3 = Math.floor(seededRandom(dailySeed + "-3") * dailyPool.length);
      while (rand3 === rand1 || rand3 === rand2) {
        rand3 = (rand3 + 1) % dailyPool.length;
      }
      pickedDaily.push({
        id: `${dailySeed}-m3`,
        category: "daily",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: dailyExpiresAt,
        ...dailyPool[rand3],
      });

      result.push(...pickedDaily);
    }

    // Weekly Missions Pool
    if (activeWeekly.length >= 3) {
      result.push(...activeWeekly);
    } else {
      const weeklyPool = [
        {
          type: "win_games" as const,
          title: "Weekly Champion",
          description: "Win 8 games this week",
          target: 8,
          reward: { xp: 850, titleId: "champion" },
          icon: "ribbon",
        },
        {
          type: "hard_expert_win" as const,
          title: "Mastery Trials",
          description: "Win 3 games on Hard or Expert",
          target: 3,
          reward: { xp: 1100 },
          icon: "skull",
        },
        {
          type: "streak" as const,
          title: "Hot Streak",
          description: "Achieve a 4-game win streak",
          target: 4,
          reward: { xp: 900 },
          icon: "flame",
        },
        {
          type: "survival_round" as const,
          title: "Survival Veteran",
          description: "Survive 5 waves in Survival Mode",
          target: 5,
          reward: { xp: 1000 },
          icon: "shield",
        },
        {
          type: "blitz_solve" as const,
          title: "Blitz Dynamo",
          description: "Solve 5 numbers in Blitz Mode",
          target: 5,
          reward: { xp: 950 },
          icon: "timer",
        },
        {
          type: "logic_puzzle" as const,
          title: "Master Deductions",
          description: "Solve 2 Logic Puzzles",
          target: 2,
          reward: { xp: 900 },
          icon: "bulb",
        },
      ];

      // Deterministically pick 3 distinct weekly missions
      const pickedWeekly: MissionProgress[] = [];
      const wRand1 = Math.floor(seededRandom(weeklySeed + "-1") * weeklyPool.length);
      pickedWeekly.push({
        id: `${weeklySeed}-w1`,
        category: "weekly",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: weeklyExpiresAt,
        ...weeklyPool[wRand1],
      });

      let wRand2 = Math.floor(seededRandom(weeklySeed + "-2") * weeklyPool.length);
      if (wRand2 === wRand1) wRand2 = (wRand2 + 1) % weeklyPool.length;
      pickedWeekly.push({
        id: `${weeklySeed}-w2`,
        category: "weekly",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: weeklyExpiresAt,
        ...weeklyPool[wRand2],
      });

      let wRand3 = Math.floor(seededRandom(weeklySeed + "-3") * weeklyPool.length);
      while (wRand3 === wRand1 || wRand3 === wRand2) {
        wRand3 = (wRand3 + 1) % weeklyPool.length;
      }
      pickedWeekly.push({
        id: `${weeklySeed}-w3`,
        category: "weekly",
        completed: false,
        claimed: false,
        current: 0,
        expiresAt: weeklyExpiresAt,
        ...weeklyPool[wRand3],
      });

      result.push(...pickedWeekly);
    }

    return result;
  }

  /**
   * Evaluates and updates mission progress upon match completion.
   */
  static evaluateMissionProgress(
    missions: MissionProgress[],
    result: GameResult,
    stats: PlayerStats,
  ): { updatedMissions: MissionProgress[]; newlyCompleted: MissionProgress[] } {
    const newlyCompleted: MissionProgress[] = [];

    const updatedMissions = missions.map((m) => {
      if (m.completed) return m;

      let progressIncrement = 0;

      switch (m.type) {
        case "play_games":
          progressIncrement = 1;
          break;
        case "win_games":
          if (result.won) progressIncrement = 1;
          break;
        case "speed_win":
          if (result.won && result.elapsedMs > 0 && result.elapsedMs < 30000) {
            progressIncrement = 1;
          }
          break;
        case "hintless_win":
          if (result.won && result.hintsUsed === 0) {
            progressIncrement = 1;
          }
          break;
        case "daily_challenge":
          if (result.isDaily && result.won) {
            progressIncrement = 1;
          }
          break;
        case "score_points":
          progressIncrement = result.score;
          break;
        case "hard_expert_win":
          if (
            result.won &&
            (result.difficulty === "hard" || result.difficulty === "expert")
          ) {
            progressIncrement = 1;
          }
          break;
        case "streak":
          if (result.won) {
            const nextStreak = stats.currentStreak + 1;
            if (nextStreak > m.current) {
              progressIncrement = nextStreak - m.current;
            }
          }
          break;
        case "survival_round":
          if (result.mode === "survival" && result.rounds > m.current) {
            progressIncrement = result.rounds - m.current;
          }
          break;
        case "blitz_solve":
          if (result.mode === "blitz" && result.rounds > m.current) {
            progressIncrement = result.rounds - m.current;
          }
          break;
        case "logic_puzzle":
          if (result.mode === "logicPuzzle" && result.won) {
            progressIncrement = 1;
          }
          break;
      }

      if (progressIncrement > 0) {
        const nextCurrent = Math.min(m.target, m.current + progressIncrement);
        const isNowCompleted = nextCurrent >= m.target;
        const updated: MissionProgress = {
          ...m,
          current: nextCurrent,
          completed: isNowCompleted,
        };

        if (isNowCompleted && !m.completed) {
          newlyCompleted.push(updated);
        }

        return updated;
      }

      return m;
    });

    return { updatedMissions, newlyCompleted };
  }

  /**
   * Claims a completed mission's reward.
   */
  static claimMissionReward(
    missions: MissionProgress[],
    missionId: string,
  ): { updatedMissions: MissionProgress[]; reward: MissionReward | null } {
    let reward: MissionReward | null = null;

    const updatedMissions = missions.map((m) => {
      if (m.id === missionId && m.completed && !m.claimed) {
        reward = m.reward;
        return { ...m, claimed: true };
      }
      return m;
    });

    return { updatedMissions, reward };
  }
}
