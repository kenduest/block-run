export const SUPPORTED_LANGUAGE_OPTIONS = ["auto", "en", "zh-Hant", "ja"];

export function normalizeLanguageSetting(value) {
    return SUPPORTED_LANGUAGE_OPTIONS.includes(value) ? value : "auto";
}

export function detectBrowserLanguage(language = navigator.language || navigator.languages?.[0] || "en") {
    const normalized = String(language).toLowerCase();
    if (normalized.startsWith("ja")) return "ja";
    if (normalized.startsWith("zh")) return "zh-Hant";
    return "en";
}

function toDatasetSuffix(attr) {
    return attr.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

export function textAt(dictionary, path, fallback = "") {
    return path.split(".").reduce((value, key) => value?.[key], dictionary) ?? fallback;
}

export function joinText(dictionary, items = []) {
    return items.filter(Boolean).join(dictionary.common.comma);
}

export function applyStaticText(root = document, dictionary, getText = textAt) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
        const fallback = element.textContent || "";
        element.textContent = getText(dictionary, element.dataset.i18n, fallback);
    });

    for (const attr of ["aria-label", "title"]) {
        root.querySelectorAll(`[data-i18n-${attr}]`).forEach((element) => {
            const key = element.dataset[`i18n${toDatasetSuffix(attr)}`];
            const fallback = element.getAttribute(attr) || "";
            const value = getText(dictionary, key, fallback);
            if (value) element.setAttribute(attr, value);
        });
    }
}
