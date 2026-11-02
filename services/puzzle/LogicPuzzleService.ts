export type PuzzleClue = {
  id: string;
  text: string;
  category: "range" | "parity" | "divisibility" | "digits" | "math";
};

export type LogicPuzzle = {
  target: number;
  min: number;
  max: number;
  clues: PuzzleClue[];
};

export class LogicPuzzleService {
  /**
   * Generates a puzzle with a mathematically verified unique solution.
   */
  static generatePuzzle(difficulty: "easy" | "medium" | "hard" | "expert" = "medium"): LogicPuzzle {
    const min = 10;
    const max = difficulty === "easy" ? 60 : difficulty === "medium" ? 90 : 99;

    // Retry loop until a puzzle with exactly 1 unique solution is generated
    for (let attempt = 0; attempt < 100; attempt++) {
      const target = Math.floor(Math.random() * (max - min + 1)) + min;
      const clues = this.buildCluesForTarget(target, min, max);

      // Verify that these clues leave exactly 1 candidate in [min..max]
      const candidates = this.findMatchingNumbers(clues, min, max);
      if (candidates.length === 1 && candidates[0] === target) {
        return {
          target,
          min,
          max,
          clues,
        };
      }
    }

    // Fallback deterministic well-tested puzzle if random seed had edge-case
    return {
      target: 42,
      min: 10,
      max: 90,
      clues: [
        { id: "c1", text: "The number is between 30 and 60.", category: "range" },
        { id: "c2", text: "The number is an even number.", category: "parity" },
        { id: "c3", text: "The number is divisible by 7.", category: "divisibility" },
        { id: "c4", text: "The sum of its digits equals 6.", category: "digits" },
      ],
    };
  }

  /**
   * Verifies if a player's proposed number is the correct solution.
   */
  static verifySolution(puzzle: LogicPuzzle, guess: number): boolean {
    return guess === puzzle.target;
  }

  private static isPrime(n: number): boolean {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }

  private static sumDigits(n: number): number {
    return Math.floor(n / 10) + (n % 10);
  }

  private static buildCluesForTarget(target: number, min: number, max: number): PuzzleClue[] {
    const clues: PuzzleClue[] = [];

    // 1. Range clue: window of roughly 30 numbers surrounding target
    const rangeSpan = 30;
    const lower = Math.max(min, target - Math.floor(Math.random() * (rangeSpan - 10)) - 5);
    const upper = Math.min(max, lower + rangeSpan);
    clues.push({
      id: "clue_range",
      text: `The number is between ${lower} and ${upper}.`,
      category: "range",
    });

    // 2. Parity clue
    const isEven = target % 2 === 0;
    clues.push({
      id: "clue_parity",
      text: isEven ? "The number is an even number." : "The number is an odd number.",
      category: "parity",
    });

    // 3. Divisibility or Prime clue
    if (this.isPrime(target)) {
      clues.push({
        id: "clue_prime",
        text: "The number is a prime number.",
        category: "math",
      });
    } else {
      // Find a prominent divisor (3, 4, 5, 6, 7, 8, 9, 11)
      const divisors = [3, 4, 5, 6, 7, 8, 9, 11].filter((d) => target % d === 0);
      if (divisors.length > 0) {
        const chosenDivisor = divisors[Math.floor(Math.random() * divisors.length)];
        clues.push({
          id: "clue_div",
          text: `The number is evenly divisible by ${chosenDivisor}.`,
          category: "divisibility",
        });
      }
    }

    // 4. Sum of digits clue
    const sum = this.sumDigits(target);
    clues.push({
      id: "clue_sum",
      text: `The sum of its two digits equals ${sum}.`,
      category: "digits",
    });

    // 5. Units or Tens comparison clue
    const tens = Math.floor(target / 10);
    const units = target % 10;
    if (tens !== units) {
      clues.push({
        id: "clue_compare",
        text:
          tens > units
            ? "The tens digit is greater than the units digit."
            : "The units digit is strictly greater than the tens digit.",
        category: "math",
      });
    } else {
      clues.push({
        id: "clue_double",
        text: "Both the tens and units digits are identical.",
        category: "digits",
      });
    }

    return clues;
  }

  private static findMatchingNumbers(clues: PuzzleClue[], min: number, max: number): number[] {
    const candidates: number[] = [];
    for (let n = min; n <= max; n++) {
      if (this.matchesAllClues(n, clues)) {
        candidates.push(n);
      }
    }
    return candidates;
  }

  private static matchesAllClues(n: number, clues: PuzzleClue[]): boolean {
    for (const clue of clues) {
      // Range check
      const rangeMatch = clue.text.match(/between (\d+) and (\d+)/);
      if (rangeMatch) {
        const low = parseInt(rangeMatch[1], 10);
        const high = parseInt(rangeMatch[2], 10);
        if (n < low || n > high) return false;
      }

      // Parity check
      if (clue.text.includes("even number") && n % 2 !== 0) return false;
      if (clue.text.includes("odd number") && n % 2 === 0) return false;

      // Prime check
      if (clue.text.includes("prime number") && !this.isPrime(n)) return false;

      // Divisibility check
      const divMatch = clue.text.match(/divisible by (\d+)/);
      if (divMatch) {
        const divisor = parseInt(divMatch[1], 10);
        if (n % divisor !== 0) return false;
      }

      // Sum of digits check
      const sumMatch = clue.text.match(/digits equals (\d+)/);
      if (sumMatch) {
        const expectedSum = parseInt(sumMatch[1], 10);
        if (this.sumDigits(n) !== expectedSum) return false;
      }

      // Comparison check
      const tens = Math.floor(n / 10);
      const units = n % 10;
      if (clue.text.includes("tens digit is greater") && tens <= units) return false;
      if (clue.text.includes("units digit is strictly greater") && units <= tens) return false;
      if (clue.text.includes("identical") && tens !== units) return false;
    }
    return true;
  }
}
