export function syncSettingsForm(state, _data, elements) {
    elements.marathonEndlessSetting.checked = state.settings.marathonEndless;
    elements.languageSetting.value = state.settings.language;
    elements.dasSetting.value = state.settings.dasMs;
    elements.arrSetting.value = state.settings.arrMs;
    elements.softDropSetting.value = state.settings.softDropMultiplier;
    elements.lockDelaySetting.value = state.settings.lockDelayMs;
    elements.nextPreviewSetting.value = state.settings.nextPreviewCount;
    elements.dasValue.textContent = `${Math.round(state.settings.dasMs)} ms`;
    elements.arrValue.textContent = `${Math.round(state.settings.arrMs)} ms`;
    elements.softDropValue.textContent = `${Math.round(state.settings.softDropMultiplier)}x`;
    elements.lockDelayValue.textContent = `${Math.round(state.settings.lockDelayMs)} ms`;
    elements.ghostSetting.checked = state.settings.ghostEnabled;
    elements.soundSetting.checked = state.settings.soundEnabled;
    if (elements.soundVolumeSetting) elements.soundVolumeSetting.value = Math.round(currentSoundVolume(state) * 100);
    elements.effectsSetting.value = state.settings.effectsLevel;
    elements.skinSetting.value = state.settings.skin;
    elements.hintsSetting.checked = state.settings.showHints;
    if (elements.soundVolumeValue) elements.soundVolumeValue.textContent = `${Math.round(currentSoundVolume(state) * 100)}%`;
}

function currentSoundVolume(state) {
    const normalized = Number(state.settings.soundVolume);
    if (Number.isFinite(normalized)) return Math.max(0, Math.min(1, normalized));
    return 0.8;
}
