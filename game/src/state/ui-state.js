import { DEFAULT_UI_SETTINGS } from "./defaults.js?v=__APP_VERSION__";

export function createInitialUiState(overrides = {}) {
    return {
        ...structuredClone(DEFAULT_UI_SETTINGS),
        ...overrides,
        keyState: {
            ...structuredClone(DEFAULT_UI_SETTINGS.keyState),
            ...(overrides.keyState || {}),
        },
    };
}

export function resetUiState(uiState = {}, overrides = {}) {
    const nextState = createInitialUiState(overrides);
    Object.keys(nextState).forEach(key => {
        uiState[key] = nextState[key];
    });
    return uiState;
}
