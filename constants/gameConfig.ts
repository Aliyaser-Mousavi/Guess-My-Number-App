import Colors from "./colors";

export type GameMode =
  | "opponent"
  | "player"
  | "timeAttack"
  | "survival"
  | "blitz"
  | "custom"
  | "passAndPlay"
  | "logicPuzzle";

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
    color: "#00D2B4",
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
    color: "#FFB800",
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
    color: "#FF5252",
  },
];

export type ModeMetadata = {
  id: GameMode;
  title: string;
  badge: string;
  shortDesc: string;
  rules: string[];
  icon: string;
  color: string;
};

export const MODE_METADATA: ModeMetadata[] = [
  {
    id: "opponent",
    title: "Oracle Guesses",
    badge: "CLASSIC",
    shortDesc: "You pick a secret number. The Oracle tracks it down.",
    rules: [
      "Think of a secret number within the chosen range.",
      "Tell the Oracle if its guess is Higher or Lower.",
      "Play honestly — the algorithm relies on your guidance!",
    ],
    icon: "sparkles",
    color: Colors.accent,
  },
  {
    id: "player",
    title: "You Guess",
    badge: "CLASSIC",
    shortDesc: "The Oracle hides a number. You hunt it before lives run out.",
    rules: [
      "The Oracle secretly picks a number.",
      "Each wrong guess consumes 1 life.",
      "Use clues and search range to zero in on the target.",
    ],
    icon: "person",
    color: Colors.primary,
  },
  {
    id: "timeAttack",
    title: "Time Attack",
    badge: "SPEED",
    shortDesc: "Beat the clock! Find the secret number before time runs out.",
    rules: [
      "Choose a countdown: 30s, 60s, or 90s.",
      "Every guess instantly narrows the search range.",
      "Faster solves earn huge speed multipliers!",
    ],
    icon: "timer",
    color: "#00E5FF",
  },
  {
    id: "survival",
    title: "Survival Mode",
    badge: "ENDLESS",
    shortDesc: "Scale an endless gauntlet of increasingly larger numbers.",
    rules: [
      "Start at Level 1 with 5 shared lives.",
      "Each solved number advances you to a wider range.",
      "Solving restores +1 life. Run ends when lives reach 0.",
    ],
    icon: "shield-checkmark",
    color: Colors.mint,
  },
  {
    id: "blitz",
    title: "Blitz Mode",
    badge: "ARCADE",
    shortDesc: "Solve as many numbers as possible in 60 frantic seconds.",
    rules: [
      "Fixed 60-second round.",
      "Numbers spawn immediately after each solve.",
      "Target is 10 numbers solved for Master rank!",
    ],
    icon: "flash",
    color: "#FFA502",
  },
  {
    id: "logicPuzzle",
    title: "Logic Puzzle",
    badge: "BRAIN",
    shortDesc: "Deduce the secret number using mathematical clues.",
    rules: [
      "Read mathematical properties: parity, divisibility, digit sum.",
      "Cross-examine clues to deduce the single unique number.",
      "Request hints if needed at a small point cost.",
    ],
    icon: "bulb",
    color: "#9C88FF",
  },
  {
    id: "passAndPlay",
    title: "Pass & Play",
    badge: "2 PLAYERS",
    shortDesc: "Challenge a friend on the same device with privacy screens.",
    rules: [
      "Player 1 secretly enters a number while Player 2 looks away.",
      "Player 2 hunts the number with Higher/Lower feedback.",
      "Roles swap, and the player with the best score wins!",
    ],
    icon: "people",
    color: Colors.coral,
  },
  {
    id: "custom",
    title: "Custom Match",
    badge: "SANDBOX",
    shortDesc: "Customize your own ranges, lives, timer, and hints.",
    rules: [
      "Define custom minimum and maximum number bounds.",
      "Set custom lives, timer limits, and hint counts.",
      "Play with your exact custom rules.",
    ],
    icon: "options",
    color: "#74B9FF",
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
  {
    id: "time_attack_master",
    title: "Clock Stopper",
    description: "Win a Time Attack game with >10s to spare",
    icon: "timer",
  },
  {
    id: "survival_veteran",
    title: "Survivalist",
    description: "Reach Level 5 in Survival Mode",
    icon: "shield-checkmark",
  },
  {
    id: "blitz_striker",
    title: "Blitz Champion",
    description: "Solve 5 or more numbers in Blitz Mode",
    icon: "flash",
  },
  {
    id: "puzzle_deducer",
    title: "Master Sleuth",
    description: "Solve a Logic Puzzle on first attempt",
    icon: "bulb",
  },
];

export function getDifficulty(id: DifficultyId): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

export function idealRounds(min: number, max: number): number {
  return Math.ceil(Math.log2(Math.max(1, max - min + 1)));
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

  let modeBonus = 0;
  if (mode === "player") modeBonus = 80;
  else if (mode === "timeAttack") modeBonus = 120;
  else if (mode === "survival") modeBonus = 150;
  else if (mode === "blitz") modeBonus = 140;
  else if (mode === "logicPuzzle") modeBonus = 160;
  else if (mode === "passAndPlay") modeBonus = 100;
  else if (mode === "custom") modeBonus = 50;

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

export function getDailyNumber(
  min: number,
  max: number,
  customSeed?: string,
): number {
  const seed = customSeed ?? getDailySeed();
  const r = seededRandom(seed + "-guess");
  return Math.floor(r * (max - min + 1)) + min;
}
