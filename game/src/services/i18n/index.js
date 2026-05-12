import {
    detectBrowserLanguage,
    normalizeLanguageSetting as normalizeLanguageSettingInternal,
    textAt as textAtDictionary,
    joinText as joinTextDictionary,
    applyStaticText as applyStaticTextDictionary,
} from "./runtime.js";
import { messages as en } from "./locales/en.js?v=__APP_VERSION__";
import { messages as zhHant } from "./locales/zh-Hant.js?v=__APP_VERSION__";
import { messages as ja } from "./locales/ja.js?v=__APP_VERSION__";

export const SUPPORTED_LANGUAGE_OPTIONS = ["auto", "en", "zh-Hant", "ja"];
export const SUPPORTED_LANGUAGES = ["en", "zh-Hant", "ja"];

const MESSAGES = {
    en,
    "zh-Hant": zhHant,
    ja,
};

let currentLanguageSetting = "auto";
let currentLanguage = "en";

export let TEXT = MESSAGES.en;

export function setLanguage(setting = "auto") {
    currentLanguageSetting = normalizeLanguageSettingInternal(setting);
    currentLanguage = currentLanguageSetting === "auto" ? detectBrowserLanguage() : currentLanguageSetting;
    TEXT = MESSAGES[currentLanguage] || MESSAGES.en;

    return {
        setting: currentLanguageSetting,
        language: currentLanguage,
    };
}

export function getLanguageSetting() {
    return currentLanguageSetting;
}

export function getCurrentLanguage() {
    return currentLanguage;
}

export function applyStaticText(root = document) {
    return applyStaticTextDictionary(root, TEXT, textAtDictionary);
}

export function textAt(path, fallback = "") {
    return textAtDictionary(TEXT, path, fallback);
}

export function joinText(items = []) {
    return joinTextDictionary(TEXT, items);
}

setLanguage("auto");

export { detectBrowserLanguage, normalizeLanguageSettingInternal as normalizeLanguageSetting };
