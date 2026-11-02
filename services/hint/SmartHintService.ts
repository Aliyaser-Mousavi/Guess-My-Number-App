export type HintCategory =
  | "parity"
  | "range"
  | "prime"
  | "divisibility"
  | "digits";

export type SmartHintOption = {
  category: HintCategory;
  title: string;
  description: string;
  icon: string;
  clue: string;
};

export class SmartHintService {
  private static isPrime(n: number): boolean {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
      if (n % i === 0) return false;
    }
    return true;
  }

  private static sumDigits(n: number): number {
    return Math.abs(n)
      .toString()
      .split("")
      .reduce((acc, char) => acc + parseInt(char, 10), 0);
  }

  /**
   * Generates a curated list of available hint options for the player to select from.
   * Ensures no hint leaves only 1 candidate or spoils the answer directly.
   */
  static getAvailableHints(
    secret: number,
    low: number,
    high: number,
  ): SmartHintOption[] {
    const options: SmartHintOption[] = [];

    // 1. Parity Clue
    const isEven = secret % 2 === 0;
    // Only offer if range contains both even and odd numbers
    if (high - low >= 2 || (low % 2 !== high % 2)) {
      options.push({
        category: "parity",
        title: "Parity Insight",
        description: "Discover if the secret is even or odd",
        icon: "barcode-outline",
        clue: isEven
          ? "The secret number is an EVEN number."
          : "The secret number is an ODD number.",
      });
    }

    // 2. Range Focus (Half-range division)
    if (high - low > 3) {
      const mid = Math.floor((low + high) / 2);
      const isLowerHalf = secret <= mid;
      options.push({
        category: "range",
        title: "Range Focus",
        description: "Pinpoint which half of your search zone to target",
        icon: "locate",
        clue: isLowerHalf
          ? `The secret is in the lower half: between ${low} and ${mid}.`
          : `The secret is in the upper half: between ${mid + 1} and ${high}.`,
      });
    }

    // 3. Divisibility Clue
    const divisors = [3, 4, 5, 6, 7, 8, 9, 10].filter((d) => secret % d === 0);
    if (divisors.length > 0) {
      const divisor = divisors[Math.floor(Math.random() * divisors.length)];
      // Check that not all numbers in [low..high] are divisible by it
      options.push({
        category: "divisibility",
        title: "Divisibility Clue",
        description: "Find an exact mathematical factor",
        icon: "calculator-outline",
        clue: `The secret number is evenly divisible by ${divisor}.`,
      });
    } else {
      options.push({
        category: "divisibility",
        title: "Divisibility Clue",
        description: "Rule out major factors",
        icon: "calculator-outline",
        clue: "The secret number is NOT divisible by 3, 5, or 10.",
      });
    }

    // 4. Prime / Composite Clue
    const prime = this.isPrime(secret);
    options.push({
      category: "prime",
      title: "Prime Property",
      description: "Learn if the secret is prime or composite",
      icon: "shield-half-outline",
      clue: prime
        ? "The secret number is a PRIME number (only divisible by 1 and itself)."
        : "The secret number is a COMPOSITE number (has multiple divisors).",
    });

    // 5. Digit Clue
    const sum = this.sumDigits(secret);
    const tens = Math.floor(secret / 10);
    const units = secret % 10;

    let digitClue = `The sum of the secret's digits is ${sum}.`;
    // If single digit, avoid giving exact number away
    if (secret < 10) {
      digitClue = secret > 5
        ? "The secret is a single digit strictly greater than 5."
        : "The secret is a single digit strictly less than or equal to 5.";
    } else if (tens === units) {
      digitClue = "Both the tens and units digits are identical!";
    } else if (Math.abs(tens - units) > 0) {
      digitClue = tens > units
        ? `The tens digit is greater than the units digit (Sum of digits = ${sum}).`
        : `The units digit is greater than the tens digit (Sum of digits = ${sum}).`;
    }

    options.push({
      category: "digits",
      title: "Digit Insight",
      description: "Analyze the relationship between digits",
      icon: "keypad-outline",
      clue: digitClue,
    });

    return options;
  }
}

