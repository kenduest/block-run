import { Renderer } from "./renderer.js?v=__APP_VERSION__";
import { chooseAutoMove, reachedAutoMove } from "./ai.js?v=__APP_VERSION__";
import { applyAction as applyCoreAction, isGrounded as isCoreGrounded, lockCurrentPiece, spawnNextPiece as spawnCorePiece } from "./core/gameplay-actions.js?v=__APP_VERSION__";
import { tick as tickCore } from "./core/game-loop.js?v=__APP_VERSION__";
import { configureRun as configureRunCore, evaluateResult as evaluateResultCore, updateModeEvents as updateModeEventsCore } from "./core/mode-runtime.js?v=__APP_VERSION__";
import { finishRun as finishRunCore } from "./core/result-flow.js?v=__APP_VERSION__";
import { TEXT, applyStaticText, joinText, setLanguage } from "./i18n.js?v=__APP_VERSION__";
import { achievementLabel, isNewBest, resultGrade, resultGradeHint, resultGradeText, unlockAchievements } from "./progression.js?v=__APP_VERSION__";
import { renderPauseSummary } from "./ui/screens/pause-screen.js?v=__APP_VERSION__";
import { renderProfileScreen } from "./ui/screens/profile-screen.js?v=__APP_VERSION__";
import { renderResultScreen } from "./ui/screens/result-screen.js?v=__APP_VERSION__";
import { syncSettingsForm } from "./ui/screens/settings-screen.js?v=__APP_VERSION__";
import { createInitialGameState, resetDemoState, resetRunState } from "./state/game-state.js?v=__APP_VERSION__";
import { createInitialUiState, resetUiState } from "./state/ui-state.js?v=__APP_VERSION__";
import {
    MODES,
    buildDailyRules,
    STAGES,
    calculateStageStars,
    currentStage,
    formatPreciseTime,
    formatTime,
    refreshLocalizedContent,
    stageGoalSummary,
    todayKey,
} from "./modes.js?v=__APP_VERSION__";
import { loadData, markStageComplete, recordGame, resetRecords, saveData, updateBestScore, DEFAULT_SETTINGS } from "./storage.js?v=__APP_VERSION__";
import {
    COLS,
    ARENA_ROWS,
    HIDDEN_ROWS,
    collide,
    countGarbageCells,
    createMatrix,
    createPiece,
    createRng,
    hashSeed,
    getGhostPosition,
    hasTopOut,
    makeGarbage,
    merge,
    pullFromBag,
    rotateWithSrs,
    scoreClear,
    sweepArena,
} from "./rules.js?v=__APP_VERSION__";
import {
    BOARD_DOUBLE_TAP_MS,
    isBoardDoubleTap,
    resolveBoardTapAction,
    resolveBoardSwipeAction,
} from "./touch.js?v=__APP_VERSION__";

const APP_VERSION = "__APP_VERSION__";
const APP_VERSION_PLACEHOLDER = "__APP" + "_VERSION__";
const DISPLAY_VERSION = APP_VERSION === APP_VERSION_PLACEHOLDER ? "dev" : APP_VERSION;
const SHORT_DISPLAY_VERSION = DISPLAY_VERSION === "dev" ? "dev" : DISPLAY_VERSION.slice(0, 7);
const HELP_OVERLAY_STORAGE_KEY = "block-run-help-overlay-seen-v1";
const ADVANCED_STATS_STORAGE_KEY = "block-run-hud-advanced-stats-v1";
const TOUCH_ACTION_COOLDOWN_MS = 120;

const elements = {
    appVersionBadge: document.getElementById("appVersionBadge"),
    board: document.getElementById("board"),
    next: document.getElementById("next"),
    hold: document.getElementById("hold"),
    screens: {
        menu: document.getElementById("menuScreen"),
        stageSelect: document.getElementById("stageSelectScreen"),
        paused: document.getElementById("pauseScreen"),
        result: document.getElementById("resultScreen"),
        settings: document.getElementById("settingsScreen"),
        profile: document.getElementById("profileScreen"),
    },
    modeList: document.getElementById("modeList"),
    stageList: document.getElementById("stageList"),
    modeName: document.getElementById("modeName"),
    objectiveText: document.getElementById("objectiveText"),
    statusBadge: document.getElementById("statusBadge"),
    score: document.getElementById("scoreValue"),
    best: document.getElementById("bestValue"),
    lines: document.getElementById("linesValue"),
    level: document.getElementById("levelValue"),
    pps: document.getElementById("ppsValue"),
    lpm: document.getElementById("lpmValue"),
    progressLabel: document.getElementById("progressLabel"),
    progressValue: document.getElementById("progressValue"),
    progressBar: document.getElementById("progressBar"),
    combo: document.getElementById("comboText"),
    hints: document.getElementById("hintsPanel"),
    quickSoundToggle: document.getElementById("quickSoundToggle"),
    pauseSummary: document.getElementById("pauseSummary"),
    resultTitle: document.getElementById("resultTitle"),
    resultLabel: document.getElementById("resultLabel"),
    resultStats: document.getElementById("resultStats"),
    resultComparison: document.getElementById("resultComparison"),
    resultGrade: document.getElementById("resultGradeValue"),
    resultGradeHint: document.getElementById("resultGradeHint"),
    resultRecordBadge: document.getElementById("resultNewRecordBadge"),
    achievementNotice: document.getElementById("achievementNotice"),
    profileSummary: document.getElementById("profileSummary"),
    achievementList: document.getElementById("achievementList"),
    replayList: document.getElementById("replayList"),
    feedbackOverlay: document.getElementById("feedbackOverlay"),
    feedbackTag: document.getElementById("feedbackTag"),
    feedbackTitle: document.getElementById("feedbackPrimary"),
    feedbackDetail: document.getElementById("feedbackSecondary"),
    feedbackTimer: document.getElementById("feedbackTimer"),
    feedbackTimerValue: document.getElementById("feedbackTimerValue"),
    statusToast: document.getElementById("statusToast"),
    statusToastText: document.getElementById("statusToastText"),
    aiAssistButton: document.getElementById("aiAssistButton"),
    touchAiAssistButton: document.getElementById("touchAiAssistButton"),
    marathonEndlessSetting: document.getElementById("marathonEndlessSetting"),
    languageSetting: document.getElementById("languageSetting"),
    dasSetting: document.getElementById("dasSetting"),
    arrSetting: document.getElementById("arrSetting"),
    softDropSetting: document.getElementById("softDropSetting"),
    lockDelaySetting: document.getElementById("lockDelaySetting"),
    nextPreviewSetting: document.getElementById("nextPreviewSetting"),
    dasValue: document.getElementById("dasValue"),
    arrValue: document.getElementById("arrValue"),
    softDropValue: document.getElementById("softDropValue"),
    lockDelayValue: document.getElementById("lockDelayValue"),
    ghostSetting: document.getElementById("ghostSetting"),
    soundSetting: document.getElementById("soundSetting"),
    soundVolumeSetting: document.getElementById("soundVolumeSetting"),
    effectsSetting: document.getElementById("effectsSetting"),
    skinSetting: document.getElementById("skinSetting"),
    hintsSetting: document.getElementById("hintsSetting"),
    soundVolumeValue: document.getElementById("soundVolumeValue"),
};

if (elements.appVersionBadge) {
    elements.appVersionBadge.textContent = `v${SHORT_DISPLAY_VERSION}`;
    elements.appVersionBadge.title = `build ${DISPLAY_VERSION}`;
}

const renderer = new Renderer(elements.board, elements.next, elements.hold);
const data = loadData();
const state = createInitialGameState(data);
const uiState = createInitialUiState();
resetUiState(uiState);
uiState.showAdvancedStats = readUiPreference(ADVANCED_STATS_STORAGE_KEY, uiState.showAdvancedStats);
uiState.helpOverlaySeen = readUiPreference(HELP_OVERLAY_STORAGE_KEY, uiState.helpOverlaySeen);
let lastTime = 0;
let audioContext = null;
const keyState = uiState.keyState;

init();

function init() {
    applyLanguage(state.settings.language);
    renderer.resize();
    buildModeMenu();
    buildStageMenu();
    syncSettingsForm(state, data, elements);
    bindEvents();
    syncTouchLayout();
    applyUiState();
    if (!uiState.helpOverlaySeen) openHelpOverlay();
    renderer.renderPreviews(null, null);
    requestAnimationFrame(update);
}

function applyLanguage(setting) {
    refreshLanguageResources(setting);
    refreshLanguageDependentViews();
    refreshCurrentScreenContent();
    applyUiState();
}

function refreshLanguageResources(setting) {
    setLanguage(setting);
    refreshLocalizedContent();
    document.title = TEXT.app.title;
    applyStaticText();
}

function refreshLanguageDependentViews() {
    buildModeMenu();
    buildStageMenu();
    syncSettingsForm(state, data, elements);
}

function refreshCurrentScreenContent() {
    refreshComboBanner();
    syncFeedbackOverlayState();
    if (state.screen === "paused") renderPauseSummary(state, elements, { MODES, TEXT, joinText });
    if (state.screen === "profile") renderProfileScreen(data, elements);
    if (state.screen === "result") {
        const resultViewModel = buildResultViewModel(null, state.latestAchievements);
        renderResultScreen(state, resultViewModel, elements);
    }
}

function buildModeMenu() {
    elements.modeList.innerHTML = "";
    const menuGroups = TEXT.menu.groups;
    const selectedGroup = menuGroups.find(group => group.id === uiState.activeMenuGroup) || menuGroups[0];
    const tabs = document.createElement("div");
    tabs.className = "mode-tabs";
    for (const group of menuGroups) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = group.id === selectedGroup.id ? "active" : "";
        tab.textContent = group.label;
        tab.addEventListener("click", () => {
            if (group.extras?.includes("profile") && group.modes.length === 0) {
                showProfile();
                return;
            }
            uiState.activeMenuGroup = group.id;
            buildModeMenu();
        });
        tabs.append(tab);
    }
    elements.modeList.append(tabs);

    const cards = document.createElement("div");
    cards.className = "mode-card-grid";
    for (const modeId of selectedGroup.modes) cards.append(createModeButton(MODES[modeId]));
    if (selectedGroup.extras?.includes("demo")) cards.append(createDemoButton());
    if (selectedGroup.extras?.includes("profile")) cards.append(createProfileButton());
    cards.classList.add(`mode-count-${cards.children.length}`);
    elements.modeList.append(cards);
}

function createModeButton(mode) {
    const button = document.createElement("button");
    button.className = "mode-card";
    button.type = "button";
    button.dataset.mode = mode.id;
    button.title = mode.description;
    button.setAttribute("aria-label", joinText([mode.label, mode.category, mode.description]));
    const progress = mode.id === "stages"
        ? TEXT.menu.stageProgress(data.completedStages.length, STAGES.length)
        : bestLabel(mode.id);
    const text = TEXT.menu.cards[mode.id] || { title: mode.label, cue: mode.category };
    button.innerHTML = `
        <span class="mode-card-copy">
            <strong>${text.title}</strong>
            <em>${text.cue}</em>
        </span>
        <span class="mode-card-footer">
            <b>${TEXT.menu.startAction}</b>
            <small>${progress}</small>
        </span>
    `;
    button.addEventListener("click", () => {
        if (mode.id === "stages") showStageSelect();
        else startMode(mode.id);
    });
    return button;
}

function createDemoButton() {
    const button = document.createElement("button");
    button.className = "mode-card demo-card";
    button.type = "button";
    const text = TEXT.menu.cards.demo;
    button.title = text.tooltip;
    button.setAttribute("aria-label", text.aria);
    button.innerHTML = `
        <span class="mode-card-copy">
            <strong>${text.title}</strong>
            <em>${text.cue}</em>
        </span>
        <span class="mode-card-footer">
            <b>${text.action}</b>
            <small>${text.progress}</small>
        </span>
    `;
    button.addEventListener("click", startDemo);
    return button;
}

function createProfileButton() {
    const button = document.createElement("button");
    button.className = "mode-card profile-card";
    button.type = "button";
    const text = TEXT.menu.cards.profile;
    button.title = text.tooltip;
    button.setAttribute("aria-label", text.aria);
    button.innerHTML = `
        <span class="mode-card-copy">
            <strong>${text.title}</strong>
            <em>${text.cue}</em>
        </span>
        <span class="mode-card-footer">
            <b>${text.action}</b>
            <small>${TEXT.menu.starsProgress(totalStars())}</small>
        </span>
    `;
    button.addEventListener("click", showProfile);
    return button;
}

function buildStageMenu() {
    elements.stageList.innerHTML = "";
    STAGES.forEach((stage, index) => {
        const stars = data.stageStars[stage.id] || 0;
        const button = document.createElement("button");
        button.className = `stage-card difficulty-${stage.difficulty}`;
        button.type = "button";
        button.innerHTML = `
            <span class="stage-number">${stage.label}</span>
            <span class="stage-copy">
                <strong>${stage.name}</strong>
                <span>${stage.description}</span>
                <small>${stageGoalSummary(stage)}</small>
            </span>
            <span class="stage-meta">
                <b>${stage.chapter}</b>
                <small>${"★".repeat(stars)}${"☆".repeat(3 - stars)}</small>
            </span>
        `;
        button.addEventListener("click", () => startStage(index));
        elements.stageList.append(button);
    });
}

function bindEvents() {
    window.addEventListener("resize", () => {
        renderer.resize();
        renderer.renderPreviews(state.nextQueue[0], state.holdPiece);
        syncTouchLayout();
    });

    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();
        const screenAtKeydown = state.screen;
        if (key === "escape") {
            event.preventDefault();
            if (state.screen === "playing") { pauseGame(); return; }
            if (state.screen === "paused") { resumeGame(); return; }
            if (state.screen === "settings") { closeSettings(); return; }
            if (state.screen === "profile" || state.screen === "stageSelect" || state.screen === "result") { showMenu(); return; }
            return;
        }
        if (key === "?" && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            command("toggle-help");
            return;
        }
        if (["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "a", "c", "p", "z", "x", "g", "r", "v"].includes(key)) {
            event.preventDefault();
        }
        if (key === "arrowleft") pressHorizontal("left");
        if (key === "arrowright") pressHorizontal("right");
        if (key === "arrowdown") keyState.down = true;
        if (key === "arrowup" || key === "x") action("rotate");
        if (key === "z") action("rotateReverse");
        if (key === " ") action("drop");
        if (key === "c") action("hold");
        if (key === "a") toggleAiAssist();
        if (key === "p") action("pause");
        if (key === "g") toggleGhost();
        if (key === "r") action("zen-undo");
        if (key === "v") action("zen-clear");
        if (screenAtKeydown === "menu" && !event.repeat && (key === "enter" || key === " ")) {
            event.preventDefault();
            startMode(state.mode);
        }
        if (screenAtKeydown === "result" && !event.repeat && (key === "enter" || key === " ")) {
            event.preventDefault();
            startMode(state.mode);
        }
    });

    document.addEventListener("keyup", event => {
        const key = event.key.toLowerCase();
        if (key === "arrowleft") releaseHorizontal("left");
        if (key === "arrowright") releaseHorizontal("right");
        if (key === "arrowdown") keyState.down = false;
    });

    document.querySelectorAll("[data-command]").forEach(button => {
        button.addEventListener("click", () => command(button.dataset.command));
    });
    document.querySelectorAll("[data-action]").forEach(button => {
        if (button.closest(".touch-pad")) return;
        button.addEventListener("click", () => action(button.dataset.action));
    });
    bindTouchPadControls();
    bindBoardTouchControls();
    document.querySelectorAll("[data-settings-tab]").forEach(button => {
        button.addEventListener("click", () => showSettingsPanel(button.dataset.settingsTab));
    });
    bindSettingControls();
    elements.quickSoundToggle.addEventListener("click", () => {
        updateSetting("soundEnabled", !state.settings.soundEnabled);
        syncSettingsForm(state, data, elements);
    });

    // Button ripple effect: track click position
    document.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        button.style.setProperty("--click-x", `${x}%`);
        button.style.setProperty("--click-y", `${y}%`);
    });
}

function bindTouchPadControls() {
    document.querySelectorAll(".touch-pad [data-action]").forEach(button => {
        const actionName = button.dataset.action;
        if (["left", "right", "down"].includes(actionName)) {
            const release = () => stopTouchAction(actionName, button);
        button.addEventListener("pointerdown", event => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (isActionDebounced(actionName)) return;
            event.preventDefault();
            startTouchAction(actionName, button);
            button.dataset.skipClick = "1";
            if (button.setPointerCapture) {
                try { button.setPointerCapture(event.pointerId); } catch {}
                }
            });
            button.addEventListener("pointerup", release);
            button.addEventListener("pointercancel", release);
            button.addEventListener("lostpointercapture", release);
            button.addEventListener("click", event => {
                if (button.dataset.skipClick === "1") {
                    delete button.dataset.skipClick;
                    event.preventDefault();
                }
            });
            return;
        }
        button.addEventListener("click", () => {
            if (isActionDebounced(actionName)) return;
            action(actionName);
        });
    });
}

function bindBoardTouchControls() {
    elements.board.addEventListener("pointerdown", event => {
        if (!isBoardTouchPointer(event)) return;
        uiState.boardPointerDown = { x: event.clientX, y: event.clientY, time: Date.now() };
    });
    elements.board.addEventListener("pointerup", event => {
        if (!isBoardTouchPointer(event)) return;
        if (state.screen !== "playing" || !state.player.matrix) return;
        event.preventDefault();

        const pointerUp = { x: event.clientX, y: event.clientY, time: Date.now() };
        const swipeAction = resolveBoardSwipeAction(uiState.boardPointerDown, pointerUp);
        uiState.boardPointerDown = null;
        if (swipeAction) {
            clearPendingBoardTap();
            uiState.previousBoardTap = null;
            action(swipeAction);
            return;
        }

        const rect = elements.board.getBoundingClientRect();
        const tap = pointerUp;
        if (isBoardDoubleTap(uiState.previousBoardTap, tap)) {
            clearPendingBoardTap();
            uiState.previousBoardTap = null;
            action("rotate");
            return;
        }

        uiState.previousBoardTap = tap;
        clearPendingBoardTap();
        uiState.pendingBoardTap = window.setTimeout(() => {
            const boardAction = resolveBoardTapAction(event.clientX, rect.left, rect.width);
            action(boardAction);
            uiState.previousBoardTap = null;
            uiState.pendingBoardTap = null;
        }, BOARD_DOUBLE_TAP_MS);
    });
}

function isBoardTouchPointer(event) {
    return event.pointerType === "touch" || event.pointerType === "pen";
}

function clearPendingBoardTap() {
    if (uiState.pendingBoardTap !== null) {
        clearTimeout(uiState.pendingBoardTap);
        uiState.pendingBoardTap = null;
    }
}

function startTouchAction(actionName, button) {
    if (state.screen !== "playing") return;
    button.classList.add("active");
    if (actionName === "left" || actionName === "right") {
        pressHorizontal(actionName);
        return;
    }
    if (actionName === "down") {
        keyState.down = true;
        action("down");
    }
}

function stopTouchAction(actionName, button) {
    button.classList.remove("active");
    if (actionName === "left" || actionName === "right") {
        releaseHorizontal(actionName);
        return;
    }
    if (actionName === "down") keyState.down = false;
}

function command(commandName) {
    if (commandName === "pause") pauseGame();
    if (commandName === "resume") resumeGame();
    if (commandName === "restart") startMode(state.mode, { restart: true });
    if (commandName === "toggle-help") toggleHelpOverlay();
    if (commandName === "toggle-advanced-stats") toggleAdvancedStats();
    if (commandName === "menu") showMenu();
    if (commandName === "hold") action("hold");
    if (commandName === "open-settings") openSettings();
    if (commandName === "close-settings") closeSettings();
    if (commandName === "reset-settings") resetSettings();
    if (commandName === "toggle-ai") toggleAiAssist();
    if (commandName === "profile") showProfile();
    if (commandName === "reset-records") resetProfileRecords();
    if (commandName === "zen-clear") action("zen-clear");
    if (commandName === "zen-undo") action("zen-undo");
}

function startMode(modeId, options = {}) {
    state.mode = modeId;
    if (modeId !== "stages") state.stageIndex = 0;
    resetRunState(state, {
        id: modeId,
        mode: modeId,
        stages: STAGES,
        stageIndex: state.stageIndex,
    });
    configureRunCore(state, modeId, {
        now: () => performance.now(),
        todayKey,
        buildDailyRules,
        currentStage: () => currentStage(state),
        hashSeed,
        createRng,
        TEXT,
    });
    state.previousLevel = state.level;
    lastTime = 0;
    state.screen = "playing";
    closeHelpOverlay();
    applyUiState();
    showStatusToast(
        options.restart
            ? TEXT.toast.modeRestarted(MODES[modeId]?.label || modeId)
            : TEXT.toast.modeStarted(MODES[modeId]?.label || modeId),
        "success",
        1400,
    );
    state.startedAt = performance.now();
    spawnPiece();
    applyStartingGarbage();
    refreshAiAssistButton();
    playTone(420, 0.05, "triangle");
}

function startStage(index) {
    state.stageIndex = index;
    startMode("stages");
}

function startDemo() {
    startMode(["sprint", "dig"].includes(state.mode) ? state.mode : "marathon");
    resetDemoState(state, {
        enabled: true,
        move: chooseAutoMove(state.arena, state.player),
    });
    refreshComboBanner();
    applyUiState();
}

function toggleAiAssist() {
    if (!state.player.matrix || !["playing", "paused"].includes(state.screen)) return;
    state.demo.enabled = !state.demo.enabled;
    state.demo.move = state.demo.enabled ? chooseAutoMove(state.arena, state.player) : null;
    state.demo.stepMs = 0;
    refreshComboBanner();
    showStatusToast(
        state.demo.enabled ? TEXT.toast.aiAssistEnabled : TEXT.toast.aiAssistDisabled,
        "info",
        1300,
    );
    if (state.screen === "paused" && state.demo.enabled) resumeGame();
    applyUiState();
}

function spawnPiece() {
    const spawnResult = spawnCorePiece(state, gameplayActionDeps());
    if (spawnResult?.gameOver) {
        finish("failed", true);
    }
    return spawnResult;
}

function applyStartingGarbage() {
    const stage = state.mode === "stages" ? currentStage(state) : null;
    const rows = state.mode === "dig"
        ? 8
        : state.mode === "daily"
            ? state.dailyRules.garbageRows
            : stage?.startingGarbage || 0;
    const pattern = state.mode === "dig" ? [4, 5, 4, 6, 3, 7, 2, 8] : stage?.garbagePattern || [];
    makeGarbage(state.arena, rows, { rng: state.rng, pattern });
    state.startingGarbageCells = countGarbageCells(state.arena);
    state.garbageCells = state.startingGarbageCells;
}

function action(actionName) {
    if (actionName === "pause") return pauseGame();
    if (state.screen !== "playing") return;
    if (actionName === "zen-clear") return clearZenBoard();
    if (actionName === "zen-undo") return undoZenStep();
    if (["left", "right", "down", "rotate", "rotateReverse", "drop", "hold"].includes(actionName)) logInput(actionName);
    if (actionName === "left") move(-1, "input");
    if (actionName === "right") move(1, "input");
    if (actionName === "down") drop(true, "input");
    if (actionName === "rotate") rotatePlayer(1, "input");
    if (actionName === "rotateReverse") rotatePlayer(-1, "input");
    if (actionName === "drop") hardDrop("input");
    if (actionName === "hold") hold("input");
    if (actionName === "ghost") toggleGhost();
}

function move(dir, source = "input") {
    return executeCoreAction(dir < 0 ? "left" : "right", { source });
}

function rotatePlayer(dir, source = "input") {
    return executeCoreAction(dir > 0 ? "rotate" : "rotateReverse", { source });
}

function drop(isSoft = false, source = "input") {
    return executeCoreAction("down", { source });
}

function hardDrop(source = "input") {
    return executeCoreAction("drop", { source });
}

function lockPiece() {
    return executeLockAndSpawn();
}

function hold(source = "input") {
    return executeCoreAction("hold", { source });
}

function executeCoreAction(actionName, options = {}) {
    const actionResult = applyCoreAction(state, actionName, gameplayActionDeps());
    if (!actionResult || actionResult.ignored) return actionResult;

    if (options.source === "repeat") logInput(actionName);

    if (actionResult.action === "hardDrop" && actionResult.lockResult) {
        const lockResult = actionResult.lockResult;
        handleLockVisuals(lockResult);
        if (lockResult.topOut && state.mode !== "zen") {
            finish("failed", true);
            return actionResult;
        }
        const spawnResult = spawnCorePiece(state, gameplayActionDeps());
        if (spawnResult?.gameOver) {
            finish("failed", true);
            return actionResult;
        }
        if (!lockResult.topOut) evaluateResult();
        return actionResult;
    }

    if (actionResult.action === "hold" && actionResult.gameOver && actionResult.topOut) {
        finish("failed", true);
        return actionResult;
    }

    return actionResult;
}

function executeLockAndSpawn() {
    const lockResult = lockCurrentPiece(state, gameplayActionDeps());
    handleLockVisuals(lockResult);
    if (lockResult.topOut && state.mode !== "zen") {
        finish("failed", true);
        return { lockResult, linesCleared: lockResult.linesCleared || 0, gameOver: true };
    }
    const spawnResult = spawnCorePiece(state, gameplayActionDeps());
    if (spawnResult?.gameOver) {
        finish("failed", true);
    } else {
        evaluateResult();
    }
    return {
        lockResult,
        spawnResult,
        linesCleared: lockResult.linesCleared || 0,
        gameOver: Boolean(spawnResult?.gameOver),
    };
}

function handleLockVisuals(lockResult) {
    const clearRows = lockResult.clearRows || [];
    if (lockResult.linesCleared) {
        const isTetrisClear = lockResult.isTetrisClear;
        state.piecesPlaced = lockResult.piecesPlaced || state.piecesPlaced;
        for (const y of clearRows) {
            renderer.burstLine(y, isTetrisClear ? 26 : 16);
        }
        if (isTetrisClear) renderer.burstCenter("tetris");
        refreshComboBanner();
        elements.combo.classList.remove("animate");
        void elements.combo.offsetWidth;
        elements.combo.classList.add("animate");
        setTimeout(() => elements.combo.classList.remove("animate"), 360);
        const detailParts = [];
        if (lockResult.combo > 0) detailParts.push(TEXT.game.combo(lockResult.combo + 1));
        if (lockResult.continuesB2b) detailParts.push(backToBackText());
        showBoardFeedback(
            isTetrisClear && TEXT.game.tetris ? TEXT.game.tetris : TEXT.game.lineClear(lockResult.linesCleared),
            joinText(detailParts),
            isTetrisClear || lockResult.combo >= 3 ? "big" : "combo",
            isTetrisClear ? 1500 : 1100,
        );
        if (lockResult.combo >= 3) pulseBoardShake();
        playLineClearSound(lockResult.linesCleared, lockResult.combo);
    } else {
        elements.combo.textContent = "";
    }
    if (lockResult.levelUp) {
        state.previousLevel = lockResult.levelAfter;
        renderer.burstCenter("level");
        showBoardFeedback(TEXT.game.levelUp || "LEVEL UP!", `${TEXT.hud.level} ${lockResult.levelAfter}`, "level", 1400);
        playTone(620, 0.12);
    }
}

function gameplayActionDeps() {
    return {
        COLS,
        spawnY: HIDDEN_ROWS,
        createPiece,
        pullFromBag,
        collide,
        rotateWithSrs,
        merge,
        sweepArena,
        countGarbageCells,
        hasTopOut,
        scoreClear,
        createMatrix,
        snapshotArena,
        renderPreviews: (nextQueue, holdPiece, previewCountValue) => {
            renderer.renderPreviews(nextQueue, holdPiece, previewCountValue);
        },
        playTone,
        chooseAutoMove,
        isGrounded: stateForCheck => isCoreGrounded(stateForCheck, { collide }),
        previewCount,
        lastSnapshot: () => state.lastSnapshot,
    };
}

function pauseGame() {
    if (state.screen === "playing") {
        state.screen = "paused";
        renderPauseSummary(state, elements, { MODES, TEXT, joinText });
        showStatusToast(TEXT.toast.paused, "warn", 1300);
        applyUiState();
    } else if (state.screen === "paused") {
        resumeGame();
    }
}

function resumeGame() {
    if (state.screen !== "paused") return;
    state.screen = "playing";
    lastTime = performance.now();
    closeHelpOverlay();
    showStatusToast(TEXT.toast.resumed, "info", 1200);
    applyUiState();
}

function showMenu() {
    state.screen = "menu";
    resetDemoState(state);
    state.player.matrix = null;
    buildModeMenu();
    buildStageMenu();
    applyUiState();
}

function showStageSelect() {
    state.screen = "stageSelect";
    resetDemoState(state);
    state.player.matrix = null;
    buildStageMenu();
    applyUiState();
}

function openSettings() {
    uiState.settingsReturnScreen = state.screen;
    state.screen = "settings";
    showSettingsPanel("controls");
    syncSettingsForm(state, data, elements);
    applyUiState();
}

function showSettingsPanel(panelId) {
    document.querySelectorAll("[data-settings-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.settingsTab === panelId);
    });
    document.querySelectorAll("[data-settings-panel]").forEach(panel => {
        panel.classList.toggle("active", panel.dataset.settingsPanel === panelId);
    });
}

function closeSettings() {
    state.screen = uiState.settingsReturnScreen === "settings" ? "menu" : uiState.settingsReturnScreen;
    applyUiState();
}

function toggleGhost() {
    updateSetting("ghostEnabled", !state.settings.ghostEnabled);
    syncSettingsForm(state, data, elements);
}

function updateSetting(key, value) {
    state.settings[key] = value;
    data.settings = state.settings;
    saveData(data);
    if (key === "language") {
        applyLanguage(state.settings.language);
        showStatusToast(`${TEXT.toast.languageChanged}: ${languageLabel(state.settings.language)}`, "info", 1700);
        return;
    }
    renderer.configure(state.settings);
    syncSettingsForm(state, data, elements);
    applyUiState();
    if (key === "nextPreviewCount" || key === "skin") {
        renderer.resize();
        renderer.renderPreviews(state.nextQueue, state.holdPiece, previewCount());
    }

    // Hold indicator: dim when hold is used or disabled
    const holdBox = document.querySelector(".preview-box:has(#hold)");
    if (holdBox) {
        const holdUnavailable = !state.canHold || state.rules.noHold;
        holdBox.classList.toggle("hold-disabled", holdUnavailable);
    }
}

function resetSettings() {
    state.settings = { ...DEFAULT_SETTINGS };
    data.settings = { ...DEFAULT_SETTINGS };
    saveData(data);
    applyLanguage(state.settings.language);
    renderer.configure(state.settings);
    syncSettingsForm(state, data, elements);
    applyUiState();
}

function bindSettingControls() {
    elements.marathonEndlessSetting.addEventListener("change", () => updateSetting("marathonEndless", elements.marathonEndlessSetting.checked));
    elements.languageSetting.addEventListener("change", () => updateSetting("language", elements.languageSetting.value));
    elements.dasSetting.addEventListener("input", () => updateSetting("dasMs", Number(elements.dasSetting.value)));
    elements.arrSetting.addEventListener("input", () => updateSetting("arrMs", Number(elements.arrSetting.value)));
    elements.softDropSetting.addEventListener("input", () => updateSetting("softDropMultiplier", Number(elements.softDropSetting.value)));
    elements.lockDelaySetting.addEventListener("input", () => updateSetting("lockDelayMs", Number(elements.lockDelaySetting.value)));
    elements.nextPreviewSetting.addEventListener("change", () => updateSetting("nextPreviewCount", Number(elements.nextPreviewSetting.value)));
    elements.ghostSetting.addEventListener("change", () => updateSetting("ghostEnabled", elements.ghostSetting.checked));
    elements.soundSetting.addEventListener("change", () => updateSetting("soundEnabled", elements.soundSetting.checked));
    elements.soundVolumeSetting?.addEventListener("input", () => updateSetting("soundVolume", Number(elements.soundVolumeSetting.value) / 100));
    elements.effectsSetting.addEventListener("change", () => updateSetting("effectsLevel", elements.effectsSetting.value));
    elements.skinSetting.addEventListener("change", () => updateSetting("skin", elements.skinSetting.value));
    elements.hintsSetting.addEventListener("change", () => updateSetting("showHints", elements.hintsSetting.checked));
}

function evaluateResult() {
    const result = evaluateResultCore(state, { MODES });
    if (result !== "playing") finish(result, false);
}

function finish(result, isGameOver) {
    state.result = result;
    state.gameOver = isGameOver || result === "failed";
    const finishPayload = finishRunCore(state, isGameOver, {
        buildRunSummary,
        isNewBest,
        resultGrade,
        updateBestScore,
        markStageComplete,
        recordGame,
        unlockAchievements,
        saveData,
        data,
        currentStage,
        calculateStageStars,
    });
    state.screen = "result";
    state.latestAchievements = finishPayload.achievements || [];
    buildModeMenu();
    buildStageMenu();
    const resultViewModel = buildResultViewModel(null, state.latestAchievements);
    renderResultScreen(state, resultViewModel, elements);
    if (state.latestAchievements.length) saveData(data);
    renderer.burstCenter(result === "success" ? "level" : "gameover");
    playTone(result === "success" ? 700 : 90, result === "success" ? 0.14 : 0.18);
    if (state.lastRunNewRecord) {
        showBoardFeedback(resultNewRecordTitle(), resultNewRecordDetail(), "record", 1800);
    }
    showStatusToast(state.gameOver
        ? TEXT.toast.resultFailed
        : TEXT.toast.resultCleared,
        state.gameOver ? "warn" : "success",
        1700,
    );
    applyUiState();
}

function buildResultViewModel(summary, achievements = []) {
    const resolvedSummary = summary || buildRunSummary();
    const pps = resolvedSummary.piecesPlaced / Math.max(state.elapsedMs / 1000, 1);
    const kpp = resolvedSummary.inputs / Math.max(resolvedSummary.piecesPlaced, 1);
    return {
        isSuccess: resolvedSummary.result === "success",
        isGameOver: resolvedSummary.result === "failed" || state.gameOver,
        score: resolvedSummary.score,
        lines: resolvedSummary.lines,
        level: resolvedSummary.level,
        best: bestLabel(state.mode),
        timeLabel: state.mode === "sprint" || state.mode === "dig" ? formatPreciseTime(resolvedSummary.elapsedMs) : formatTime(resolvedSummary.elapsedMs),
        maxCombo: resolvedSummary.maxCombo,
        pps: pps.toFixed(2),
        kpp: kpp.toFixed(1),
        stageStars: state.mode === "stages" ? TEXT.game.valueSlashTotal(calculateStageStars(state), 3) : null,
        grade: resultGradeText(state.lastResultGrade),
        gradeHint: resultGradeHint(state.lastResultGrade),
        gradeState: state.lastResultGrade,
        badgeState: state.lastRunNewRecord ? "active" : "idle",
        badgeText: state.lastRunNewRecord ? resultNewRecordTitle() : (TEXT.result.newRecordPending || ""),
        achievementNotice: achievements.length
            ? `${TEXT.result.achievementPrefix}${achievements.map(achievementLabel).join(TEXT.common.comma)}`
            : "",
        replayHint: state.gameOver ? TEXT.result.restartHint : TEXT.result.replayHint,
        comparison: buildResultComparison(resolvedSummary),
        gradeLabel: TEXT.result.gradeLabel,
    };
}

function buildResultComparison(resolvedSummary) {
    const mode = resolvedSummary.mode;
    const metric = compareMetricByMode(resolvedSummary);
    const latestReplay = data.recentReplays?.[1];
    const previousSummary = latestReplay?.mode === mode ? latestReplay?.result || null : null;
    const previousMetric = previousSummary ? metric.value(previousSummary) : null;
    const bestRecord = bestRecordForMode(resolvedSummary);
    const bestMetric = bestRecord ? metric.value(bestRecord) : null;
    const currentMetric = metric.value(resolvedSummary);

    if (!Number.isFinite(previousMetric) && !Number.isFinite(bestMetric)) return null;

    const rows = [];
    if (Number.isFinite(previousMetric)) {
        rows.push(buildComparisonRow(TEXT.result.comparisonLast, metric, previousMetric, currentMetric));
    }
    if (Number.isFinite(bestMetric)) {
        rows.push(buildComparisonRow(TEXT.result.comparisonBest, metric, bestMetric, currentMetric));
    }

    return {
        title: TEXT.result.comparisonTitle,
        rows,
    };
}

function compareMetricByMode(summary) {
    if (summary.mode === "sprint" || summary.mode === "dig" || summary.mode === "daily") {
        return {
            value: value => Number(value.elapsedMs || 0),
            format: value => formatPreciseTime(Number(value)),
            valueKey: "elapsedMs",
            lowerIsBetter: true,
        };
    }
    return {
        value: value => Number(value.score || 0),
        format: value => `${Math.round(Number(value))}`,
        valueKey: "score",
        lowerIsBetter: false,
    };
}

function bestRecordForMode(summary) {
    if (summary.mode === "daily") return data.daily?.[summary.dailyKey] || null;
    if (summary.mode === "sprint" || summary.mode === "dig") return data.bestScores?.[summary.mode] || null;
    const best = data.bestScores?.[summary.mode];
    return Number(best) > 0 ? { score: Number(best) } : null;
}

function buildComparisonRow(label, metric, baseValue, currentValue) {
    const base = Number(baseValue);
    const current = Number(currentValue);
    if (!Number.isFinite(base) || !Number.isFinite(current)) return "";
    const baselineDiff = current - base;
    const isImproved = metric.lowerIsBetter ? baselineDiff < 0 : baselineDiff > 0;
    const isSame = Math.abs(baselineDiff) < 1e-6;
    const deltaText = isSame
        ? `（${TEXT.result.deltaSame}）`
        : `（${isImproved ? TEXT.result.deltaBetter : TEXT.result.deltaWorse} ${metric.format(Math.abs(baselineDiff))}）`;
    const statusClass = isSame ? "same" : isImproved ? "better" : "worse";

    return `<div class="result-comparison-item ${statusClass}"><span>${label}</span><strong>${metric.format(base)}</strong> <small>${deltaText}</small></div>`;
}

function applyUiState() {
    if (state.screen !== "playing") {
        clearPendingBoardTap();
        uiState.previousBoardTap = null;
        uiState.boardPointerDown = null;
    }
    for (const [name, screen] of Object.entries(elements.screens)) {
        screen.classList.toggle("active", name === state.screen);
    }

    document.body.classList.remove(
        "screen-menu",
        "screen-stageSelect",
        "screen-playing",
        "screen-paused",
        "screen-result",
        "screen-settings",
        "screen-profile",
        "game-over",
    );
    document.body.classList.add(`screen-${state.screen}`);
    document.body.classList.toggle("game-over", state.screen === "result" && state.gameOver);
    document.body.classList.toggle("training-hidden", !["training", "sprint", "ultra", "dig"].includes(state.mode));
    document.body.classList.toggle("next-preview-hidden", previewCount() === 0);
    document.body.classList.toggle("hud-advanced-stats", Boolean(uiState.showAdvancedStats));
    elements.hints.hidden = !state.settings.showHints;
    elements.modeName.textContent = state.screen === "menu"
        ? TEXT.screens.menu
        : state.screen === "stageSelect"
            ? TEXT.screens.stageSelect
            : MODES[state.mode]?.label || TEXT.screens.menu;
    elements.statusBadge.textContent = statusText();
    elements.statusBadge.className = "";
    if (state.screen === "playing") elements.statusBadge.classList.add("playing");
    else if (state.screen === "paused") elements.statusBadge.classList.add("paused");
    else if (state.screen === "result") elements.statusBadge.classList.add(state.result === "success" ? "result-success" : "result-failed");
    elements.objectiveText.textContent = state.screen === "menu"
        ? TEXT.hud.chooseMode
        : state.screen === "stageSelect"
            ? TEXT.hud.chooseStage
            : MODES[state.mode].objectiveText(state);
    if (state.screen === "paused") renderPauseSummary(state, elements, { MODES, TEXT, joinText });
    if (state.score !== uiState.lastDisplayedScore) {
        elements.score.textContent = state.score;
        elements.score.parentElement.classList.remove("pop");
        void elements.score.parentElement.offsetWidth;
        elements.score.parentElement.classList.add("pop");
        setTimeout(() => elements.score.parentElement.classList.remove("pop"), 260);
        uiState.lastDisplayedScore = state.score;
    } else {
        elements.score.textContent = state.score;
    }
    elements.best.textContent = data.bestScores[state.mode] || 0;
    elements.lines.textContent = state.lines;
    elements.level.textContent = state.level;
    if (state.level > state.previousLevel) {
        elements.level.parentElement.classList.add("level-up");
        setTimeout(() => elements.level.parentElement.classList.remove("level-up"), 650);
    }
    const minutes = Math.max(state.elapsedMs / 60000, 1 / 60);
    elements.pps.textContent = (state.piecesPlaced / Math.max(state.elapsedMs / 1000, 1)).toFixed(2);
    elements.lpm.textContent = (state.lines / minutes).toFixed(1);

    const progress = MODES[state.mode]?.progress(state) || { label: TEXT.hud.goal, value: "-", ratio: 0 };
    elements.progressLabel.textContent = progress.label;
    elements.progressValue.textContent = progress.value;
    elements.progressBar.style.width = `${Math.max(0, Math.min(1, progress.ratio)) * 100}%`;
    elements.best.textContent = bestLabel(state.mode).replace(new RegExp(`^${TEXT.best.prefix}\\s*`), "");
    refreshAiAssistButton();
    elements.quickSoundToggle.textContent = state.settings.soundEnabled ? "🔊" : "🔇";
    elements.quickSoundToggle.classList.toggle("muted", !state.settings.soundEnabled);
    syncRendererLayout();
    syncFeedbackOverlayState();
    syncTouchLayout();
}

function syncRendererLayout() {
    if (uiState.pendingRendererLayoutFrame !== null) cancelAnimationFrame(uiState.pendingRendererLayoutFrame);
    uiState.pendingRendererLayoutFrame = requestAnimationFrame(() => {
        uiState.pendingRendererLayoutFrame = null;
        renderer.resize();
        renderer.renderPreviews(state.nextQueue, state.holdPiece, previewCount());
    });
}

function statusText() {
    if (state.screen === "menu") return TEXT.status.ready;
    if (state.screen === "stageSelect") return TEXT.status.stageSelect;
    if (state.screen === "paused") return TEXT.status.paused;
    if (state.screen === "settings") return TEXT.status.settings;
    if (state.screen === "profile") return TEXT.status.profile;
    if (state.screen === "result") return state.result === "success" ? TEXT.status.success : TEXT.status.ended;
    return TEXT.status.playing;
}

function update(time = 0) {
    const deltaTime = Math.min(48, time - lastTime || 0);
    lastTime = time;

    if (state.screen === "playing") {
        const loopState = tickCore(state, deltaTime, {
            keyState,
            applyAction: (actionName, actionContext) => executeCoreAction(actionName, {
                source: actionContext?.source || "tick",
            }),
            updateModeEvents: (state, deltaMs) => updateModeEvents(deltaMs),
            getFallSpeed: currentState => MODES[currentState.mode].speedCurve(currentState.level, currentState),
            collide,
            isSoftDropActive: () => keyState.down,
            onLock: () => executeLockAndSpawn(),
            evaluateResult: () => evaluateResultCore(state, { MODES }),
            chooseAutoMove,
            reachedAutoMove,
        });
        if (loopState.result && loopState.result !== "playing" && state.screen === "playing") {
            finish(loopState.result, false);
        }
    }

    renderer.tickParticles(deltaTime);
    const ghostPos = state.player.matrix ? getGhostPosition(state.arena, state.player) : null;
    renderer.render(state, ghostPos);
    updateLiveHud();
    requestAnimationFrame(update);
}

function updateLiveHud() {
    if (!["playing", "paused"].includes(state.screen)) return;
    elements.score.textContent = state.score;
    uiState.lastDisplayedScore = state.score;
    elements.lines.textContent = state.lines;
    elements.level.textContent = state.level;
    const minutes = Math.max(state.elapsedMs / 60000, 1 / 60);
    elements.pps.textContent = (state.piecesPlaced / Math.max(state.elapsedMs / 1000, 1)).toFixed(2);
    elements.lpm.textContent = (state.lines / minutes).toFixed(1);
    const progress = MODES[state.mode]?.progress(state) || { label: TEXT.hud.goal, value: "-", ratio: 0 };
    elements.progressLabel.textContent = progress.label;
    elements.progressValue.textContent = progress.value;
    elements.progressBar.style.width = `${Math.max(0, Math.min(1, progress.ratio)) * 100}%`;
    refreshAiAssistButton();
    if (state.screen === "paused") renderPauseSummary(state, elements, { MODES, TEXT, joinText });
}

function refreshComboBanner() {
    if (!["playing", "paused"].includes(state.screen)) return;
    if (state.mystery?.activeMs > 0 && state.mystery?.activeLabel) {
        elements.combo.textContent = TEXT.game.mystery(state.mystery.activeLabel);
        return;
    }
    if (state.demo.enabled) {
        elements.combo.textContent = TEXT.game.aiActive;
        return;
    }
    if (state.b2bChain > 1 && state.lastClear === 0) {
        elements.combo.textContent = backToBackText();
        return;
    }
    if (state.lastClear > 0) {
        const fragments = [state.combo > 0 ? TEXT.game.combo(state.combo + 1) : TEXT.game.lineClear(state.lastClear)];
        if (state.b2bChain > 1) fragments.push(backToBackText());
        elements.combo.textContent = joinText(fragments.filter(Boolean));
        return;
    }
    elements.combo.textContent = "";
}

function refreshAiAssistButton() {
    const assistButtons = [elements.aiAssistButton, elements.touchAiAssistButton].filter(Boolean);
    const label = state.demo.enabled ? TEXT.actions.cancelAiAssist : TEXT.actions.aiAssist;
    const disabled = !state.player.matrix
        || state.screen === "menu"
        || state.screen === "stageSelect"
        || state.screen === "settings"
        || state.screen === "profile"
        || state.screen === "result";
    assistButtons.forEach(button => {
        button.textContent = label;
        button.classList.toggle("active", state.demo.enabled);
        button.disabled = disabled;
        button.setAttribute("aria-pressed", state.demo.enabled ? "true" : "false");
    });
}

function runDemo(deltaTime) {
    if (!state.demo.enabled || !state.player.matrix) return;
    state.demo.stepMs += deltaTime;
    if (state.demo.stepMs < 95) return;
    state.demo.stepMs = 0;

    const target = state.demo.move || chooseAutoMove(state.arena, state.player);
    state.demo.move = target;

    if (target.rotation > 0) {
        rotatePlayer(1, "demo");
        target.rotation--;
        return;
    }
    if (state.player.pos.x < target.x) return move(1, "demo");
    if (state.player.pos.x > target.x) return move(-1, "demo");
    if (reachedAutoMove(state.player, target)) hardDrop("demo");
}

function pressHorizontal(name) {
    const entry = keyState[name];
    if (entry.down) return;
    entry.down = true;
    entry.das = 0;
    entry.arr = 0;
    action(name);
}

function releaseHorizontal(name) {
    keyState[name].down = false;
    keyState[name].das = 0;
    keyState[name].arr = 0;
}

function updateModeEvents(deltaTime) {
    const modeEvents = updateModeEventsCore(state, deltaTime, {
        makeGarbage,
        countGarbageCells,
        currentStage: () => currentStage(state),
        TEXT,
    });

    if (modeEvents?.periodicGarbage) renderer.burstCenter("gameover");

    if (modeEvents?.mystery?.warningShown) {
        showBoardFeedback(mysteryWarningTitle(), mysteryWarningDetail(), "warning", 1100);
    }
    if (modeEvents?.mystery?.timerVisible && elements.feedbackTimer && elements.feedbackTimerValue) {
        elements.feedbackTimer.hidden = false;
        elements.feedbackTimerValue.textContent = formatTime(Math.max(0, Math.round(modeEvents.mystery.nextInMs || 0)));
    }
    if (modeEvents?.mystery?.triggered) {
        if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
        const label = state.mystery?.activeLabel;
        showBoardFeedback(TEXT.game.mystery(label || ""), backToBackText(false), "warning", 1500);
        refreshComboBanner();
    }

    return modeEvents;
}

function clearZenBoard() {
    if (state.mode !== "zen") return;
    state.lastSnapshot = snapshotArena();
    state.arena = createMatrix(COLS, ARENA_ROWS);
    state.garbageCells = 0;
    logInput("zen-clear");
    renderer.burstCenter("level");
}

function undoZenStep() {
    if (state.mode !== "zen" || !state.lastSnapshot) return;
    state.arena = state.lastSnapshot.arena.map(row => row.slice());
    state.score = state.lastSnapshot.score;
    state.lines = state.lastSnapshot.lines;
    state.garbageCells = countGarbageCells(state.arena);
    logInput("zen-undo");
}

function snapshotArena() {
    return {
        arena: state.arena.map(row => row.slice()),
        score: state.score,
        lines: state.lines,
    };
}

function logInput(actionName) {
    state.inputs++;
    state.inputLog.push([Math.round(state.elapsedMs), actionName]);
    if (state.inputLog.length > 1600) state.inputLog.shift();
}

function buildRunSummary() {
    const pps = state.piecesPlaced / Math.max(state.elapsedMs / 1000, 1);
    const kpp = state.inputs / Math.max(state.piecesPlaced, 1);
    return {
        mode: state.mode,
        result: state.result,
        score: state.score,
        lines: state.lines,
        level: state.level,
        elapsedMs: Math.round(state.elapsedMs),
        piecesPlaced: state.piecesPlaced,
        inputs: state.inputs,
        pps,
        kpp,
        maxCombo: state.maxCombo,
        tetrisCount: state.tetrisCount,
        seed: state.seed,
        stageId: state.mode === "stages" ? currentStage(state).id : null,
        stars: state.mode === "stages" ? calculateStageStars(state) : 0,
        dailyKey: state.dailyKey,
        inputLog: state.inputLog.slice(-420),
    };
}

function previewCount() {
    if (state.rules.limitedPreview !== null && state.rules.limitedPreview !== undefined) return Number(state.rules.limitedPreview);
    return Number(state.settings.nextPreviewCount ?? 3);
}

function bestLabel(modeId) {
    const best = data.bestScores[modeId];
    if (modeId === "sprint" || modeId === "dig") return best?.elapsedMs ? `${TEXT.best.prefix} ${formatPreciseTime(best.elapsedMs)}` : TEXT.best.noRecord;
    if (modeId === "daily") {
        const record = data.daily[todayKey()];
        return record ? `${TEXT.best.todayPrefix} ${record.score}` : TEXT.best.todayIncomplete;
    }
    return `${TEXT.best.prefix} ${Number(best) || 0}`;
}

function totalStars() {
    return Object.values(data.stageStars).reduce((sum, stars) => sum + Number(stars || 0), 0);
}

function showProfile() {
    state.screen = "profile";
    resetDemoState(state);
    renderProfileScreen(data, elements);
    applyUiState();
}

function resetProfileRecords() {
    if (!window.confirm(TEXT.profile.resetConfirm)) return;
    resetRecords(data);
    renderProfileScreen(data, elements);
    buildModeMenu();
    applyUiState();
}

function playTone(frequency, duration, type = "triangle") {
    if (!state.settings.soundEnabled) return;
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    playScheduledTone(frequency, duration, type, 0, 0.052 * currentSoundVolume());
}

function playLineClearSound(cleared, combo = 0) {
    if (!state.settings.soundEnabled) return;
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const start = cleared === 4 ? 520 : 430 + cleared * 42;
    const steps = cleared === 4
        ? [start, start * 1.22, start * 1.5, start * 1.86]
        : [start, start * 1.18, start * (1.36 + cleared * 0.04)];
    const volume = Math.min(0.085, 0.052 + cleared * 0.008 + Math.max(combo, 0) * 0.003) * currentSoundVolume();

    steps.forEach((frequency, index) => {
        playScheduledTone(frequency, 0.07, index % 2 === 0 ? "triangle" : "square", index * 0.045, volume);
    });
    if (cleared === 4) {
        playScheduledTone(1040, 0.12, "sine", 0.19, 0.07);
    }
}

function playScheduledTone(frequency, duration, type = "triangle", delay = 0, volume = 0.052) {
    if (!audioContext) return;
    const startAt = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.type = type;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration);
}

function showBoardFeedback(title, detail = "", tone = "combo", duration = 1200) {
    if (!elements.feedbackOverlay || !elements.feedbackTitle || !elements.feedbackDetail) return;
    const effectiveDuration = feedbackDuration(duration, tone);
    elements.feedbackOverlay.hidden = false;
    elements.feedbackOverlay.setAttribute("aria-hidden", "false");
    elements.feedbackTitle.textContent = title || "";
    elements.feedbackDetail.textContent = detail || "";
    if (elements.feedbackTag) elements.feedbackTag.textContent = feedbackTag(tone);
    elements.feedbackOverlay.dataset.state = "active";
    elements.feedbackOverlay.dataset.tone = tone;
    if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
    if (uiState.boardFeedbackTimer) clearTimeout(uiState.boardFeedbackTimer);
    uiState.boardFeedbackTimer = window.setTimeout(() => {
        elements.feedbackOverlay.dataset.state = "idle";
        elements.feedbackOverlay.dataset.tone = "";
        if (elements.feedbackTag) elements.feedbackTag.textContent = TEXT.feedback.combo;
        elements.feedbackTitle.textContent = TEXT.feedback.readyPrimary;
        elements.feedbackDetail.textContent = TEXT.feedback.readySecondary;
        if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
        syncFeedbackOverlayState();
    }, effectiveDuration);
    if (tone === "big") pulseBoardShake();
}

function feedbackDuration(duration, tone) {
    if (!state.demo.enabled) return duration;
    if (tone === "record") return Math.max(900, Math.round(duration * 0.6));
    if (tone === "warning") return Math.max(650, Math.round(duration * 0.65));
    return Math.max(420, Math.round(duration * 0.45));
}

function syncFeedbackOverlayState() {
    if (!elements.feedbackOverlay) return;
    const shouldShow = ["playing", "paused"].includes(state.screen) || elements.feedbackOverlay.dataset.state === "active";
    elements.feedbackOverlay.hidden = !shouldShow;
    elements.feedbackOverlay.setAttribute("aria-hidden", shouldShow ? "false" : "true");
}

function pulseBoardShake() {
    document.body.classList.remove("board-shake");
    void document.body.offsetWidth;
    document.body.classList.add("board-shake");
    window.setTimeout(() => document.body.classList.remove("board-shake"), 260);
}

function backToBackText(fallbackEmpty = true) {
    if (state.b2bChain <= 1) return fallbackEmpty ? "" : "";
    return typeof TEXT.game.backToBack === "function" ? TEXT.game.backToBack(state.b2bChain) : `B2B x${state.b2bChain}`;
}

function feedbackTag(tone) {
    if (tone === "record") return TEXT.result.newRecordLabel || "Record";
    if (tone === "level") return TEXT.hud.level || "Level";
    if (tone === "warning") return TEXT.feedback.mysteryCountdown || "Warning";
    return TEXT.feedback.combo || "Combo";
}

function mysteryWarningTitle() {
    return TEXT.game.mysteryWarningTitle || "MYSTERY";
}

function mysteryWarningDetail() {
    if (typeof TEXT.game.mysteryWarningDetail === "function") {
        return TEXT.game.mysteryWarningDetail(formatTime(Math.max(state.mystery?.nextInMs || 0, 0)));
    }
    return `Event in ${formatTime(Math.max(state.mystery?.nextInMs || 0, 0))}`;
}

function resultNewRecordTitle() {
    return TEXT.result.newRecord || "NEW RECORD";
}

function resultNewRecordDetail() {
    if (typeof TEXT.result.newRecordDetail === "function") {
        return TEXT.result.newRecordDetail(bestLabel(state.mode).replace(new RegExp(`^${TEXT.best.prefix}\\s*`), ""));
    }
    return "";
}

function currentSoundVolume() {
    const normalized = Number(state.settings.soundVolume);
    if (Number.isFinite(normalized)) return Math.max(0, Math.min(1, normalized));
    return 0.8;
}

function readUiPreference(key, fallback) {
    try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        if (raw === "1") return true;
        if (raw === "0") return false;
        if (raw === "true") return true;
        if (raw === "false") return false;
    } catch {
    }
    return fallback;
}

function writeUiPreference(key, value) {
    try {
        window.localStorage.setItem(key, value ? "1" : "0");
    } catch {}
}

function isActionDebounced(actionName) {
    const now = performance.now();
    if (!uiState.touchActionCooldownByAction) uiState.touchActionCooldownByAction = {};
    const previous = uiState.touchActionCooldownByAction[actionName] || 0;
    if (now < previous) return true;
    uiState.touchActionCooldownByAction[actionName] = now + TOUCH_ACTION_COOLDOWN_MS;
    return false;
}

function toggleAdvancedStats() {
    uiState.showAdvancedStats = !uiState.showAdvancedStats;
    writeUiPreference(ADVANCED_STATS_STORAGE_KEY, uiState.showAdvancedStats);
    applyUiState();
    showStatusToast(
        uiState.showAdvancedStats ? TEXT.toast.advancedStatsOn : TEXT.toast.advancedStatsOff,
        "info",
        1000,
    );
}

function openHelpOverlay() {
    const helpOverlay = document.getElementById("helpOverlay");
    if (!helpOverlay) return;
    if (helpOverlay.dataset.state === "active") return;
    helpOverlay.hidden = false;
    helpOverlay.dataset.state = "active";
    helpOverlay.setAttribute("aria-hidden", "false");
    uiState.helpOverlaySeen = true;
    writeUiPreference(HELP_OVERLAY_STORAGE_KEY, true);
    showStatusToast(TEXT.toast.helpOpened, "info", 1000);
}

function closeHelpOverlay() {
    const helpOverlay = document.getElementById("helpOverlay");
    if (!helpOverlay) return;
    if (helpOverlay.dataset.state !== "active") return;
    helpOverlay.dataset.state = "idle";
    helpOverlay.hidden = true;
    helpOverlay.setAttribute("aria-hidden", "true");
}

function toggleHelpOverlay() {
    const helpOverlay = document.getElementById("helpOverlay");
    if (!helpOverlay) return;
    if (helpOverlay.dataset.state === "active") {
        closeHelpOverlay();
        showStatusToast(TEXT.toast.helpClosed, "warn", 900);
    } else {
        openHelpOverlay();
    }
}

function syncTouchLayout() {
    const touchPad = document.querySelector(".touch-pad");
    if (!touchPad) return;
    const prefersTouch = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(hover: none)").matches || (navigator.maxTouchPoints || 0) > 0;
    touchPad.classList.toggle("compact", window.innerWidth <= 420 && prefersTouch);
}

function showStatusToast(message, kind = "info", duration = 1200) {
    if (!elements.statusToast || !elements.statusToastText) return;
    if (uiState.statusToastTimer) clearTimeout(uiState.statusToastTimer);
    elements.statusToastText.textContent = String(message || "");
    elements.statusToast.dataset.kind = kind;
    elements.statusToast.dataset.state = "active";
    elements.statusToast.setAttribute("aria-hidden", "false");
    elements.statusToast.hidden = false;
    uiState.statusToastTimer = window.setTimeout(() => {
        elements.statusToast.dataset.state = "idle";
        elements.statusToast.setAttribute("aria-hidden", "true");
        elements.statusToast.hidden = true;
    }, Math.max(700, duration));
}

function languageLabel(language) {
    if (language === "auto") return TEXT.settings?.gameplay?.languageAuto || "Auto";
    if (language === "en") return "English";
    if (language === "zh-Hant") return TEXT.settings?.gameplay?.languageZhHant || "繁體中文";
    if (language === "ja") return TEXT.settings?.gameplay?.languageJapanese || "日本語";
    return language;
}
