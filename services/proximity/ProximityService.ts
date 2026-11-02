export type ProximityLevel =
  | "very_hot"
  | "hot"
  | "warm"
  | "cold"
  | "very_cold";

export type ProximityFeedback = {
  level: ProximityLevel;
  label: string;
  sublabel: string;
  color: string;
  icon: string;
  percentageDistance: number;
  distance: number;
};

export class ProximityService {
  /**
   * Calculates the proximity of a guess relative to the secret target and the available search range.
   */
  static getProximity(
    guess: number,
    secret: number,
    rangeMin: number,
    rangeMax: number,
  ): ProximityFeedback {
    const distance = Math.abs(guess - secret);
    const span = Math.max(1, rangeMax - rangeMin);
    const ratio = distance / span;

    if (distance === 0) {
      return {
        level: "very_hot",
        label: "TARGET SOLVED!",
        sublabel: "Right on the mark!",
        color: "#3DDC97",
        icon: "checkmark-circle",
        percentageDistance: 0,
        distance: 0,
      };
    }

    if (distance <= 2 || ratio <= 0.05) {
      return {
        level: "very_hot",
        label: "BURNING HOT",
        sublabel: "Within striking distance!",
        color: "#FF3B30",
        icon: "flame",
        percentageDistance: Math.round(ratio * 100),
        distance,
      };
    }

    if (distance <= 6 || ratio <= 0.12) {
      return {
        level: "hot",
        label: "HOT",
        sublabel: "Getting very close!",
        color: "#FF9500",
        icon: "flame-outline",
        percentageDistance: Math.round(ratio * 100),
        distance,
      };
    }

    if (ratio <= 0.25) {
      return {
        level: "warm",
        label: "WARM",
        sublabel: "Moving in the right direction",
        color: "#FFCC00",
        icon: "sunny",
        percentageDistance: Math.round(ratio * 100),
        distance,
      };
    }

    if (ratio <= 0.45) {
      return {
        level: "cold",
        label: "COLD",
        sublabel: "Quite a ways away",
        color: "#5AC8FA",
        icon: "snow",
        percentageDistance: Math.round(ratio * 100),
        distance,
      };
    }

    return {
      level: "very_cold",
      label: "FREEZING COLD",
      sublabel: "Far off target",
      color: "#007AFF",
      icon: "cube",
      percentageDistance: Math.round(ratio * 100),
      distance,
    };
  }
}

