import type { DigitFormatOption, LanguageOption } from "@/types/game";
import { TRANSLATIONS, type TranslationKey } from "./translations";

export type { TranslationKey };

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export class LocalizationService {
  /**
   * Retrieves a localized string by key and interpolates optional parameters.
   */
  static t(
    key: TranslationKey,
    lang: LanguageOption = "en",
    params?: Record<string, string | number>,
  ): string {
    const dict = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
    let text = dict[key] ?? TRANSLATIONS.en[key] ?? String(key);

    if (params) {
      for (const [paramKey, paramVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`{${paramKey}}`, "g"), String(paramVal));
      }
    }
    return text;
  }

  /**
   * Checks whether the given language uses Right-to-Left script.
   */
  static isRTL(lang: LanguageOption = "en"): boolean {
    return lang === "fa";
  }

  /**
   * Formats numbers and digits according to player's digit preference (Latin or Persian).
   */
  static formatNumber(
    val: number | string | null | undefined,
    digitFormat: DigitFormatOption = "latin",
  ): string {
    if (val == null) return "";
    const str = String(val);
    if (digitFormat !== "persian") return str;

    return str.replace(/\d/g, (char) => {
      const idx = parseInt(char, 10);
      return PERSIAN_DIGITS[idx] ?? char;
    });
  }

  /**
   * Formats timestamps/dates into locale-aware formatted date strings.
   */
  static formatDate(
    val: number | Date,
    lang: LanguageOption = "en",
  ): string {
    const d = typeof val === "number" ? new Date(val) : val;
    try {
      if (lang === "fa") {
        return new Intl.DateTimeFormat("fa-IR", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(d);
      }
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  /**
   * Returns the appropriate forward navigation icon depending on text direction.
   */
  static getChevronForward(lang: LanguageOption): "chevron-forward" | "chevron-back" {
    return this.isRTL(lang) ? "chevron-back" : "chevron-forward";
  }

  /**
   * Returns the appropriate back navigation icon depending on text direction.
   */
  static getArrowBack(lang: LanguageOption): "arrow-back" | "arrow-forward" {
    return this.isRTL(lang) ? "arrow-forward" : "arrow-back";
  }
}
