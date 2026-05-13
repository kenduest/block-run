export function syncSettingsForm(state, _data, elements) {
    elements.marathonEndlessSetting.checked = state.settings.marathonEndless;
    elements.languageSetting.value = state.settings.language;
    elements.dasSetting.value = state.settings.dasMs;
    elements.arrSetting.value = state.settings.arrMs;
    elements.softDropSetting.value = state.settings.softDropMultiplier;
    elements.lockDelaySetting.value = state.settings.lockDelayMs;
    elements.nextPreviewSetting.value = state.settings.nextPreviewCount;
    elements.dasValue.textContent = formatDasReadout(state.settings.dasMs);
    elements.arrValue.textContent = formatArrReadout(state.settings.arrMs);
    elements.softDropValue.textContent = formatSoftDropReadout(state.settings.softDropMultiplier);
    elements.lockDelayValue.textContent = `${Math.round(state.settings.lockDelayMs)} ms`;
    elements.ghostSetting.checked = state.settings.ghostEnabled;
    elements.soundSetting.checked = state.settings.soundEnabled;
    if (elements.soundVolumeSetting) elements.soundVolumeSetting.value = Math.round(currentSoundVolume(state) * 100);
    elements.effectsSetting.value = state.settings.effectsLevel;
    elements.skinSetting.value = state.settings.skin;
    elements.hintsSetting.checked = state.settings.showHints;
    if (elements.colorBlindSetting) elements.colorBlindSetting.value = state.settings.colorBlindMode || "off";
    if (elements.hapticSetting) elements.hapticSetting.checked = state.settings.hapticEnabled !== false;
    if (elements.ghostDangerSetting) elements.ghostDangerSetting.checked = state.settings.ghostDangerPulse !== false;
    if (elements.soundVolumeValue) elements.soundVolumeValue.textContent = `${Math.round(currentSoundVolume(state) * 100)}%`;
}

function formatDasReadout(ms) {
    const value = Math.round(ms);
    const frames = (value / (1000 / 60)).toFixed(1);
    return `${value} ms · ~${frames} frames @60fps`;
}

function formatArrReadout(ms) {
    const value = Math.round(ms);
    if (value === 0) return "0 ms · Instant DAS";
    const cellsPerSec = (1000 / value).toFixed(1);
    return `${value} ms · ~${cellsPerSec} cells/s`;
}

function formatSoftDropReadout(mult) {
    const value = Math.round(mult);
    return `${value}x · drops ~${value} times faster`;
}

function currentSoundVolume(state) {
    const normalized = Number(state.settings.soundVolume);
    if (Number.isFinite(normalized)) return Math.max(0, Math.min(1, normalized));
    return 0.8;
}
