export type GameMode = "opponent" | "player";
export type DifficultyId = "easy" | "medium" | "hard" | "expert";

export type Difficulty = {
  id: DifficultyId;
  label: string;
  description: string;
  min: number;
  max: number;
  multiplier: number;
  playerLives: number;
  hints: number;
  color: string;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: "easy",
    label: "Easy",
    description: "1 – 50 · 3 hints",
    min: 1,
    max: 50,
    multiplier: 1,
    playerLives: 8,
    hints: 3,
    color: "#3DDC97",
  },
  {
    id: "medium",
    label: "Medium",
    description: "1 – 100 · 2 hints",
    min: 1,
    max: 100,
    multiplier: 1.5,
    playerLives: 7,
    hints: 2,
    color: "#1FA8A0",
  },
  {
    id: "hard",
    label: "Hard",
    description: "1 – 200 · 1 hint",
    min: 1,
    max: 200,
    multiplier: 2.25,
    playerLives: 8,
    hints: 1,
    color: "#F0A500",
  },
  {
    id: "expert",
    label: "Expert",
    description: "1 – 500 · no hints",
    min: 1,
    max: 500,
    multiplier: 3.5,
    playerLives: 9,
    hints: 0,
    color: "#E85D4C",
  },
];

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_win",
    title: "First Blood",
    description: "Win your first game",
    icon: "trophy",
  },
  {
    id: "streak_3",
    title: "On Fire",
    description: "Win 3 games in a row",
    icon: "flame",
  },
  {
    id: "streak_7",
    title: "Unstoppable",
    description: "Win 7 games in a row",
    icon: "rocket",
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    description: "Finish a game in under 15 seconds",
    icon: "flash",
  },
  {
    id: "efficient",
    title: "Mind Reader",
    description: "Win in 5 rounds or fewer",
    icon: "bulb",
  },
  {
    id: "hard_master",
    title: "Hard Mode Hero",
    description: "Win a Hard or Expert game",
    icon: "skull",
  },
  {
    id: "player_pro",
    title: "Number Hunter",
    description: "Win in You Guess mode",
    icon: "search",
  },
  {
    id: "daily_done",
    title: "Daily Devotee",
    description: "Complete a Daily Challenge",
    icon: "calendar",
  },
  {
    id: "games_25",
    title: "Quarter Century",
    description: "Play 25 games",
    icon: "medal",
  },
  {
    id: "games_100",
    title: "Centurion",
    description: "Play 100 games",
    icon: "ribbon",
  },
  {
    id: "high_score_1k",
    title: "Point Collector",
    description: "Score 1,000+ in a single game",
    icon: "star",
  },
  {
    id: "perfect_hintless",
    title: "No Help Needed",
    description: "Win without using any hints",
    icon: "eye-off",
  },
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function idealRounds(min: number, max: number): number {
  return Math.ceil(Math.log2(max - min + 1));
}

export function calculateScore({
  rounds,
  elapsedMs,
  difficulty,
  hintsUsed,
  won,
  mode,
}: {
  rounds: number;
  elapsedMs: number;
  difficulty: Difficulty;
  hintsUsed: number;
  won: boolean;
  mode: GameMode;
}): number {
  if (!won) return 0;

  const rangeSize = difficulty.max - difficulty.min + 1;
  const ideal = idealRounds(difficulty.min, difficulty.max);
  const roundFactor = Math.max(0.35, ideal / Math.max(rounds, 1));
  const timeSeconds = elapsedMs / 1000;
  const timeBonus = Math.max(0, 120 - timeSeconds) * 2;
  const hintPenalty = hintsUsed * 40;
  const modeBonus = mode === "player" ? 80 : 0;

  const raw =
    (220 + rangeSize * 0.8) * difficulty.multiplier * roundFactor +
    timeBonus +
    modeBonus -
    hintPenalty;

  return Math.max(50, Math.round(raw));
}

export function getDailySeed(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function getDailyNumber(min: number, max: number): number {
  const seed = getDailySeed();
  const r = seededRandom(seed + "-guess");
  return Math.floor(r * (max - min + 1)) + min;
}
