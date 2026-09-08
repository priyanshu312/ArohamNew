import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { hi } from "./locales/hi";
import { kn } from "./locales/kn";

const LANGUAGE_KEY = "user-language";

const languageDetector = {
  type: "languageDetector" as const,
  async: true,
  detect: (callback: (lng: string) => void) => {
    try {
      // 1. Check saved language preference first
      const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
      if (savedLanguage) {
        return callback(savedLanguage);
      }

      // 2. Otherwise detect browser default language
      const systemLanguage = navigator.language?.split("-")[0] || "en";

      // Only default to en, hi, or kn. Fallback to 'en' otherwise.
      const defaultLanguage =
        systemLanguage === "hi" || systemLanguage === "kn" || systemLanguage === "en"
          ? systemLanguage
          : "en";
      callback(defaultLanguage);
    } catch (error) {
      console.warn("Error detecting language preference:", error);
      callback("en");
    }
  },
  init: () => {},
  cacheUserLanguage: (language: string) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.warn("Error caching user language preference:", error);
    }
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    compatibilityJSON: "v4",
    fallbackLng: "en",
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      kn: { translation: kn },
    },
    interpolation: {
      escapeValue: false, // React protects from XSS
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
