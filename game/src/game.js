import { Renderer } from "./renderer.js?v=__APP_VERSION__";
import { chooseAutoMove, reachedAutoMove } from "./ai.js?v=__APP_VERSION__";
import { TEXT, applyStaticText, joinText, setLanguage } from "./i18n.js?v=__APP_VERSION__";
import { ACHIEVEMENT_IDS, achievementLabel, describeAchievementProgress, isNewBest, resultGrade, resultGradeHint, resultGradeText, unlockAchievements } from "./progression.js?v=__APP_VERSION__";
import {
    MODES,
    STAGES,
    buildDailyRules,
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
    collide,
    countGarbageCells,
    createMatrix,
    createPiece,
    createRng,
    getGhostPosition,
    hasTopOut,
    hashSeed,
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
const DISPLAY_VERSION = APP_VERSION.includes("__APP_VERSION__") ? "dev" : APP_VERSION;
const SHORT_DISPLAY_VERSION = DISPLAY_VERSION === "dev" ? "dev" : DISPLAY_VERSION.slice(0, 7);

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
    resultTitle: document.getElementById("resultTitle"),
    resultLabel: document.getElementById("resultLabel"),
    resultStats: document.getElementById("resultStats"),
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
    pauseFocusValue: document.getElementById("pauseFocusValue"),
    pauseInputValue: document.getElementById("pauseInputValue"),
    pauseExitValue: document.getElementById("pauseExitValue"),
};

if (elements.appVersionBadge) {
    elements.appVersionBadge.textContent = `v${SHORT_DISPLAY_VERSION}`;
    elements.appVersionBadge.title = `build ${DISPLAY_VERSION}`;
}

const renderer = new Renderer(elements.board, elements.next, elements.hold);
const data = loadData();
let activeMenuGroup = "featured";

const state = {
    screen: "menu",
    mode: "marathon",
    stageIndex: 0,
    score: 0,
    lines: 0,
    level: 1,
    b2bChain: 0,
    combo: -1,
    maxCombo: 0,
    lastClear: 0,
    tetrisCount: 0,
    zoneMeter: 0,
    zoneActiveMs: 0,
    garbageCells: 0,
    startingGarbageCells: 0,
    elapsedMs: 0,
    startedAt: 0,
    piecesPlaced: 0,
    inputs: 0,
    inputLog: [],
    lastSnapshot: null,
    seed: 0,
    rng: Math.random,
    rules: {},
    dailyKey: null,
    dailyRules: null,
    mystery: null,
    hiddenBlocksActive: false,
    garbageTickMs: 0,
    result: "playing",
    gameOver: false,
    arena: createMatrix(COLS, ARENA_ROWS),
    player: { pos: { x: 0, y: 0 }, matrix: null, type: null, rotation: 0 },
    nextQueue: [],
    holdPiece: null,
    canHold: true,
    settings: data.settings,
    demo: { enabled: false, move: null, stepMs: 0 },
    latestAchievements: [],
    lastResultGrade: "C",
    lastRunNewRecord: false,
};

let bag = [];
let dropCounter = 0;
let lockCounter = 0;
let moveResetCount = 0;
let lastTime = 0;
let lastDisplayedScore = 0;
let audioContext = null;
let previousLevel = 1;
let settingsReturnScreen = "menu";
let pendingBoardTap = null;
let previousBoardTap = null;
let boardPointerDown = null;
let boardFeedbackTimer = null;
const keyState = {
    left: { down: false, das: 0, arr: 0 },
    right: { down: false, das: 0, arr: 0 },
    down: false,
};

init();

function init() {
    applyLanguage(state.settings.language);
    renderer.resize();
    buildModeMenu();
    buildStageMenu();
    syncSettingsForm();
    bindEvents();
    applyUiState();
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
    syncSettingsForm();
}

function refreshCurrentScreenContent() {
    refreshComboBanner();
    syncFeedbackOverlayState();
    if (state.screen === "paused") renderPauseSummary();
    if (state.screen === "profile") renderProfile();
    if (state.screen === "result") renderResult(state.latestAchievements);
}

function buildModeMenu() {
    elements.modeList.innerHTML = "";
    const menuGroups = TEXT.menu.groups;
    const selectedGroup = menuGroups.find(group => group.id === activeMenuGroup) || menuGroups[0];
    const tabs = document.createElement("div");
    tabs.className = "mode-tabs";
    for (const group of menuGroups) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = group.id === selectedGroup.id ? "active" : "";
        tab.textContent = group.label;
        tab.addEventListener("click", () => {
            activeMenuGroup = group.id;
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
    });

    document.addEventListener("keydown", event => {
        const key = event.key.toLowerCase();
        if (key === "escape") {
            event.preventDefault();
            if (state.screen === "playing") { pauseGame(); return; }
            if (state.screen === "paused") { resumeGame(); return; }
            if (state.screen === "settings") { closeSettings(); return; }
            if (state.screen === "profile" || state.screen === "stageSelect" || state.screen === "result") { showMenu(); return; }
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
        if (state.screen === "result" && (key === "enter" || key === " ")) {
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
        syncSettingsForm();
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
        button.addEventListener("click", () => action(actionName));
    });
}

function bindBoardTouchControls() {
    elements.board.addEventListener("pointerdown", event => {
        if (!isBoardTouchPointer(event)) return;
        boardPointerDown = { x: event.clientX, y: event.clientY, time: Date.now() };
    });
    elements.board.addEventListener("pointerup", event => {
        if (!isBoardTouchPointer(event)) return;
        if (state.screen !== "playing" || !state.player.matrix) return;
        event.preventDefault();

        const pointerUp = { x: event.clientX, y: event.clientY, time: Date.now() };
        const swipeAction = resolveBoardSwipeAction(boardPointerDown, pointerUp);
        boardPointerDown = null;
        if (swipeAction) {
            clearPendingBoardTap();
            previousBoardTap = null;
            action(swipeAction);
            return;
        }

        const rect = elements.board.getBoundingClientRect();
        const tap = pointerUp;
        if (isBoardDoubleTap(previousBoardTap, tap)) {
            clearPendingBoardTap();
            previousBoardTap = null;
            action("rotate");
            return;
        }

        previousBoardTap = tap;
        clearPendingBoardTap();
        pendingBoardTap = window.setTimeout(() => {
            const boardAction = resolveBoardTapAction(event.clientX, rect.left, rect.width);
            action(boardAction);
            previousBoardTap = null;
            pendingBoardTap = null;
        }, BOARD_DOUBLE_TAP_MS);
    });
}

function isBoardTouchPointer(event) {
    return event.pointerType === "touch" || event.pointerType === "pen";
}

function clearPendingBoardTap() {
    if (pendingBoardTap !== null) {
        clearTimeout(pendingBoardTap);
        pendingBoardTap = null;
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
    if (commandName === "restart") startMode(state.mode);
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

function startMode(modeId) {
    state.mode = modeId;
    state.demo = { enabled: false, move: null, stepMs: 0 };
    if (modeId !== "stages") state.stageIndex = 0;
    resetState();
    configureRun(modeId);
    state.screen = "playing";
    applyUiState();
    renderer.resize();
    state.startedAt = performance.now();
    previousLevel = state.level;
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
    state.demo.enabled = true;
    state.demo.move = chooseAutoMove(state.arena, state.player);
    refreshComboBanner();
    applyUiState();
}

function toggleAiAssist() {
    if (!state.player.matrix || !["playing", "paused"].includes(state.screen)) return;
    state.demo.enabled = !state.demo.enabled;
    state.demo.move = state.demo.enabled ? chooseAutoMove(state.arena, state.player) : null;
    state.demo.stepMs = 0;
    refreshComboBanner();
    if (state.screen === "paused" && state.demo.enabled) resumeGame();
    applyUiState();
}

function resetState() {
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.b2bChain = 0;
    state.combo = -1;
    state.maxCombo = 0;
    state.lastClear = 0;
    state.tetrisCount = 0;
    state.zoneMeter = 0;
    state.zoneActiveMs = 0;
    state.garbageCells = 0;
    state.startingGarbageCells = 0;
    state.elapsedMs = 0;
    state.piecesPlaced = 0;
    state.inputs = 0;
    state.inputLog = [];
    state.lastSnapshot = null;
    state.seed = 0;
    state.rng = Math.random;
    state.rules = {};
    state.dailyKey = null;
    state.dailyRules = null;
    state.mystery = null;
    state.hiddenBlocksActive = false;
    state.garbageTickMs = 0;
    state.result = "playing";
    state.gameOver = false;
    state.lastResultGrade = "C";
    state.lastRunNewRecord = false;
    state.arena = createMatrix(COLS, ARENA_ROWS);
    state.player = { pos: { x: 0, y: 0 }, matrix: null, type: null, rotation: 0 };
    state.nextQueue = [];
    state.holdPiece = null;
    state.canHold = true;
    bag = [];
    dropCounter = 0;
    lockCounter = 0;
    moveResetCount = 0;
    lastTime = 0;
    fillQueue();
}

function configureRun(modeId) {
    const dateKey = todayKey();
    const stage = modeId === "stages" ? currentStage(state) : null;
    state.seed = modeId === "daily"
        ? MODES.daily.buildSeed(dateKey)
        : hashSeed(`${modeId}-${stage?.id || "free"}-${Date.now()}`);
    state.rng = createRng(state.seed);
    state.rules = {
        endless: modeId === "marathon" && state.settings.marathonEndless,
        noHold: stage?.modifiers?.noHold || false,
        limitedPreview: stage?.modifiers?.limitedPreview || null,
        periodicGarbageMs: stage?.modifiers?.periodicGarbageMs || null,
        zoneMeter: stage?.modifiers?.zoneMeter || modeId === "zen",
    };
    if (modeId === "daily") {
        state.dailyKey = dateKey;
        state.dailyRules = buildDailyRules(dateKey);
        state.seed = state.dailyRules.seed;
        state.rng = createRng(state.seed);
    }
    if (modeId === "mystery" || stage?.modifiers?.mystery) {
        state.mystery = { nextInMs: 30000, activeLabel: TEXT.game.activeLabel, speedMultiplier: 1, activeMs: 0, events: 0, warningShown: false };
    }
}

function fillQueue() {
    while (state.nextQueue.length < 5) {
        const pulled = pullFromBag(bag, state.rng);
        bag = pulled.bag;
        state.nextQueue.push(pulled.type);
    }
}

function spawnPiece() {
    fillQueue();
    const type = state.nextQueue.shift();
    state.player.type = type;
    state.player.matrix = createPiece(type);
    state.player.rotation = 0;
    state.player.pos.y = 0;
    state.player.pos.x = Math.floor(COLS / 2) - Math.floor(state.player.matrix[0].length / 2);
    state.canHold = true;
    fillQueue();
    if (collide(state.arena, state.player)) {
        if (state.mode === "zen") {
            state.arena = createMatrix(COLS, ARENA_ROWS);
            state.garbageCells = 0;
        } else {
            finish("failed", true);
        }
    }
    state.demo.move = state.demo.enabled ? chooseAutoMove(state.arena, state.player) : null;
    renderer.renderPreviews(state.nextQueue, state.holdPiece, previewCount());
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
    if (actionName === "left") move(-1);
    if (actionName === "right") move(1);
    if (actionName === "down") drop(true);
    if (actionName === "rotate") rotatePlayer(1);
    if (actionName === "rotateReverse") rotatePlayer(-1);
    if (actionName === "drop") hardDrop();
    if (actionName === "hold") hold();
    if (actionName === "ghost") toggleGhost();
}

function move(dir) {
    state.player.pos.x += dir;
    if (collide(state.arena, state.player)) {
        state.player.pos.x -= dir;
    } else {
        resetLockDelay();
        playTone(260, 0.025);
    }
}

function rotatePlayer(dir) {
    if (!rotateWithSrs(state.arena, state.player, dir)) return;
    resetLockDelay();
    playTone(330, 0.035);
}

function drop(isSoft = false) {
    state.player.pos.y++;
    if (collide(state.arena, state.player)) {
        state.player.pos.y--;
        if (isSoft) lockCounter = state.settings.lockDelayMs;
        else startLockDelay();
    } else if (isSoft) {
        state.score += 1;
    }
    dropCounter = 0;
}

function hardDrop() {
    let distance = 0;
    while (!collide(state.arena, state.player)) {
        state.player.pos.y++;
        distance++;
    }
    state.player.pos.y--;
    state.score += Math.max(0, distance - 1) * 2;
    state.lastSnapshot = snapshotArena();
    const cleared = lockPiece();
    dropCounter = 0;
    if (!cleared) playTone(150, 0.05, "sawtooth");
}

function lockPiece() {
    merge(state.arena, state.player);
    state.piecesPlaced++;
    const clearedRows = sweepArena(state.arena);
    const topOut = hasTopOut(state.arena);
    state.garbageCells = countGarbageCells(state.arena);
    state.lastClear = clearedRows.length;
    if (clearedRows.length) {
        const isTetrisClear = clearedRows.length === 4;
        const continuesB2b = isTetrisClear && state.b2bChain > 0;
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.b2bChain = isTetrisClear ? state.b2bChain + 1 : 0;
        state.score += scoreClear(clearedRows.length, state.level, state.combo);
        state.lines += clearedRows.length;
        if (isTetrisClear) state.tetrisCount++;
        state.zoneMeter = Math.min(100, state.zoneMeter + clearedRows.length * 12 + (clearedRows.length === 4 ? 12 : 0));
        state.level = Math.floor(state.lines / 10) + 1;
        for (const y of clearedRows) renderer.burstLine(y, isTetrisClear ? 26 : 16);
        if (isTetrisClear) renderer.burstCenter("tetris");
        refreshComboBanner();
        elements.combo.classList.remove("animate");
        void elements.combo.offsetWidth;
        elements.combo.classList.add("animate");
        setTimeout(() => elements.combo.classList.remove("animate"), 360);
        const detailParts = [];
        if (state.combo > 0) detailParts.push(TEXT.game.combo(state.combo + 1));
        if (continuesB2b) detailParts.push(backToBackText());
        showBoardFeedback(
            isTetrisClear && TEXT.game.tetris ? TEXT.game.tetris : TEXT.game.lineClear(clearedRows.length),
            joinText(detailParts),
            isTetrisClear || state.combo >= 3 ? "big" : "combo",
            isTetrisClear ? 1500 : 1100,
        );
        if (state.combo >= 3) pulseBoardShake();
        playLineClearSound(clearedRows.length, state.combo);
    } else {
        state.combo = -1;
        state.lastClear = 0;
        elements.combo.textContent = "";
    }
    lockCounter = 0;
    moveResetCount = 0;
    if (state.level > previousLevel) {
        previousLevel = state.level;
        renderer.burstCenter("level");
        showBoardFeedback(TEXT.game.levelUp || "LEVEL UP!", `${TEXT.hud.level} ${state.level}`, "level", 1400);
        playTone(620, 0.12);
    }
    if (topOut && state.mode !== "zen") {
        finish("failed", true);
        return clearedRows.length;
    }
    spawnPiece();
    evaluateResult();
    return clearedRows.length;
}

function hold() {
    if (!state.canHold || state.rules.noHold) return;
    const current = state.player.type;
    if (state.holdPiece) {
        state.player.type = state.holdPiece;
        state.player.matrix = createPiece(state.player.type);
        state.player.rotation = 0;
        state.holdPiece = current;
        state.player.pos.y = 0;
        state.player.pos.x = Math.floor(COLS / 2) - Math.floor(state.player.matrix[0].length / 2);
        if (collide(state.arena, state.player)) finish("failed", true);
    } else {
        state.holdPiece = current;
        spawnPiece();
    }
    state.canHold = false;
    renderer.renderPreviews(state.nextQueue, state.holdPiece, previewCount());
    playTone(520, 0.04);
}

function pauseGame() {
    if (state.screen === "playing") {
        state.screen = "paused";
        renderPauseSummary();
        applyUiState();
    } else if (state.screen === "paused") {
        resumeGame();
    }
}

function resumeGame() {
    if (state.screen !== "paused") return;
    state.screen = "playing";
    lastTime = performance.now();
    applyUiState();
}

function showMenu() {
    state.screen = "menu";
    state.demo = { enabled: false, move: null, stepMs: 0 };
    state.player.matrix = null;
    buildModeMenu();
    buildStageMenu();
    applyUiState();
}

function showStageSelect() {
    state.screen = "stageSelect";
    state.demo = { enabled: false, move: null, stepMs: 0 };
    state.player.matrix = null;
    buildStageMenu();
    applyUiState();
}

function openSettings() {
    settingsReturnScreen = state.screen;
    state.screen = "settings";
    showSettingsPanel("controls");
    syncSettingsForm();
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
    state.screen = settingsReturnScreen === "settings" ? "menu" : settingsReturnScreen;
    applyUiState();
}

function toggleGhost() {
    updateSetting("ghostEnabled", !state.settings.ghostEnabled);
    syncSettingsForm();
}

function updateSetting(key, value) {
    state.settings[key] = value;
    data.settings = state.settings;
    saveData(data);
    if (key === "language") {
        applyLanguage(state.settings.language);
        return;
    }
    renderer.configure(state.settings);
    syncSettingsForm();
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
    syncSettingsForm();
    applyUiState();
}

function syncSettingsForm() {
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
    if (elements.soundVolumeSetting) elements.soundVolumeSetting.value = Math.round(currentSoundVolume() * 100);
    elements.effectsSetting.value = state.settings.effectsLevel;
    elements.skinSetting.value = state.settings.skin;
    elements.hintsSetting.checked = state.settings.showHints;
    if (elements.soundVolumeValue) elements.soundVolumeValue.textContent = `${Math.round(currentSoundVolume() * 100)}%`;
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
    const result = MODES[state.mode].resultEvaluator(state);
    if (result !== "playing") finish(result, false);
}

function finish(result, isGameOver) {
    state.result = result;
    state.gameOver = isGameOver || result === "failed";
    state.screen = "result";
    const summary = buildRunSummary();
    state.lastRunNewRecord = isNewBest(summary, data);
    state.lastResultGrade = resultGrade(summary);
    updateBestScore(data, state.mode, state.score, summary);
    if (state.mode === "stages" && result === "success") markStageComplete(data, currentStage(state).id, summary.stars);
    recordGame(data, summary);
    const achievements = unlockAchievements(data, state);
    if (achievements.length) saveData(data);
    state.latestAchievements = achievements;
    renderer.burstCenter(result === "success" ? "level" : "gameover");
    playTone(result === "success" ? 700 : 90, result === "success" ? 0.14 : 0.18);
    if (state.lastRunNewRecord) {
        showBoardFeedback(resultNewRecordTitle(), resultNewRecordDetail(), "record", 1800);
    }
    buildModeMenu();
    buildStageMenu();
    renderResult(achievements);
    applyUiState();
}

function renderResult(achievements = []) {
    const success = state.result === "success";
    elements.resultLabel.textContent = state.gameOver ? TEXT.result.labelGameOver : TEXT.result.label;
    elements.resultTitle.textContent = success ? TEXT.result.success : state.gameOver ? TEXT.result.gameOver : TEXT.result.done;
    const pps = state.piecesPlaced / Math.max(state.elapsedMs / 1000, 1);
    const kpp = state.inputs / Math.max(state.piecesPlaced, 1);
    const timeLabel = state.mode === "sprint" || state.mode === "dig" ? formatPreciseTime(state.elapsedMs) : formatTime(state.elapsedMs);
    const stats = state.gameOver
        ? [
            [TEXT.result.fields.score, state.score],
            [TEXT.result.fields.lines, state.lines],
            [TEXT.result.fields.level, state.level],
            [TEXT.result.fields.time, timeLabel],
        ]
        : [
            [TEXT.result.fields.score, state.score],
            [TEXT.result.fields.best, bestLabel(state.mode)],
            [TEXT.result.fields.lines, state.lines],
            [TEXT.result.fields.level, state.level],
            [TEXT.result.fields.maxCombo, comboValue(state.maxCombo)],
            [TEXT.result.fields.time, timeLabel],
            [TEXT.result.fields.pps, pps.toFixed(2)],
            [TEXT.result.fields.kpp, kpp.toFixed(1)],
        ];
    if (state.mode === "stages") stats.push([TEXT.result.fields.stars, TEXT.game.valueSlashTotal(calculateStageStars(state), 3)]);
    elements.resultStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    if (elements.resultGrade) {
        elements.resultGrade.textContent = resultGradeText(state.lastResultGrade);
        elements.resultGrade.dataset.grade = state.lastResultGrade;
    }
    if (elements.resultGradeHint) elements.resultGradeHint.textContent = resultGradeHint(state.lastResultGrade);
    if (elements.resultRecordBadge) {
        elements.resultRecordBadge.dataset.state = state.lastRunNewRecord ? "active" : "idle";
        const badgeValue = elements.resultRecordBadge.querySelector("strong");
        if (badgeValue) badgeValue.textContent = state.lastRunNewRecord ? resultNewRecordTitle() : (TEXT.result.newRecordPending || "");
    }
    elements.achievementNotice.textContent = achievements.length
        ? `${TEXT.result.achievementPrefix}${achievements.map(achievementLabel).join(TEXT.common.comma)}`
        : "";
    let gameoverHint = document.getElementById("gameoverHint");
    if (!gameoverHint) {
        gameoverHint = document.createElement("p");
        gameoverHint.id = "gameoverHint";
        gameoverHint.className = "gameover-hint";
        elements.resultStats.parentNode.insertBefore(gameoverHint, elements.resultStats.nextSibling);
    }
    gameoverHint.textContent = state.gameOver ? TEXT.result.restartHint : TEXT.result.replayHint;
    document.getElementById("improvementTips")?.remove();
}

function applyUiState() {
    if (state.screen !== "playing") {
        clearPendingBoardTap();
        previousBoardTap = null;
        boardPointerDown = null;
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
    if (state.screen === "paused") renderPauseSummary();
    if (state.score !== lastDisplayedScore) {
        elements.score.textContent = state.score;
        elements.score.parentElement.classList.remove("pop");
        void elements.score.parentElement.offsetWidth;
        elements.score.parentElement.classList.add("pop");
        setTimeout(() => elements.score.parentElement.classList.remove("pop"), 260);
        lastDisplayedScore = state.score;
    } else {
        elements.score.textContent = state.score;
    }
    elements.best.textContent = data.bestScores[state.mode] || 0;
    elements.lines.textContent = state.lines;
    elements.level.textContent = state.level;
    if (state.level > previousLevel) {
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
    renderer.renderPreviews(state.nextQueue, state.holdPiece, previewCount());
    syncFeedbackOverlayState();
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
        state.elapsedMs += deltaTime;
        state.zoneActiveMs = Math.max(0, state.zoneActiveMs - deltaTime);
        updateInputRepeat(deltaTime);
        updateModeEvents(deltaTime);
        runDemo(deltaTime);
        const softMultiplier = keyState.down ? state.settings.softDropMultiplier : 1;
        dropCounter += deltaTime * softMultiplier;
        if (dropCounter > MODES[state.mode].speedCurve(state.level, state)) drop(keyState.down);
        updateLockDelay(deltaTime);
        evaluateResult();
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
    lastDisplayedScore = state.score;
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
    if (state.screen === "paused") renderPauseSummary();
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
        rotatePlayer(1);
        target.rotation--;
        return;
    }
    if (state.player.pos.x < target.x) return move(1);
    if (state.player.pos.x > target.x) return move(-1);
    if (reachedAutoMove(state.player, target)) hardDrop();
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

function updateInputRepeat(deltaTime) {
    for (const [name, entry] of Object.entries({ left: keyState.left, right: keyState.right })) {
        if (!entry.down) continue;
        entry.das += deltaTime;
        if (entry.das < state.settings.dasMs) continue;
        entry.arr += deltaTime;
        const interval = Math.max(1, state.settings.arrMs);
        while (entry.arr >= interval) {
            entry.arr -= interval;
            action(name);
            if (state.settings.arrMs === 0) break;
        }
    }
}

function startLockDelay() {
    if (lockCounter <= 0) lockCounter = 1;
}

function resetLockDelay() {
    if (!isGrounded() || moveResetCount >= 15) return;
    lockCounter = 1;
    moveResetCount++;
}

function updateLockDelay(deltaTime) {
    if (!state.player.matrix || !isGrounded()) {
        lockCounter = 0;
        return;
    }
    if (lockCounter <= 0) lockCounter = 1;
    lockCounter += deltaTime;
    if (lockCounter >= state.settings.lockDelayMs) lockPiece();
}

function isGrounded() {
    if (!state.player.matrix) return false;
    state.player.pos.y++;
    const grounded = collide(state.arena, state.player);
    state.player.pos.y--;
    return grounded;
}

function updateModeEvents(deltaTime) {
    if (state.rules.periodicGarbageMs) {
        state.garbageTickMs += deltaTime;
        if (state.garbageTickMs >= state.rules.periodicGarbageMs) {
            state.garbageTickMs = 0;
            makeGarbage(state.arena, 1, { rng: state.rng, pattern: currentStage(state).garbagePattern });
            state.garbageCells = countGarbageCells(state.arena);
            renderer.burstCenter("gameover");
        }
    }

    if (state.mystery) {
        state.mystery.nextInMs -= deltaTime;
        state.mystery.activeMs = Math.max(0, state.mystery.activeMs - deltaTime);
        if (state.mystery.activeMs <= 0) {
            state.hiddenBlocksActive = false;
            state.mystery.speedMultiplier = 1;
        }
        if (!state.mystery.warningShown && state.mystery.nextInMs > 0 && state.mystery.nextInMs <= 3000) {
            state.mystery.warningShown = true;
            showBoardFeedback(mysteryWarningTitle(), mysteryWarningDetail(), "warning", 1100);
        }
        if (state.mystery.warningShown && state.mystery.nextInMs > 0 && state.mystery.nextInMs <= 3000 && elements.feedbackTimer && elements.feedbackTimerValue) {
            elements.feedbackTimer.hidden = false;
            elements.feedbackTimerValue.textContent = formatTime(state.mystery.nextInMs);
        }
        if (state.mystery.nextInMs <= 0) triggerMysteryEvent();
    }
}

function triggerMysteryEvent() {
    const events = [
        () => {
            state.mystery.activeLabel = TEXT.game.mysteryEvents.speed;
            state.mystery.speedMultiplier = 0.62;
            state.mystery.activeMs = 8000;
        },
        () => {
            state.mystery.activeLabel = TEXT.game.mysteryEvents.hidden;
            state.hiddenBlocksActive = true;
            state.mystery.activeMs = 5000;
        },
        () => {
            state.mystery.activeLabel = TEXT.game.mysteryEvents.reversePreview;
            state.nextQueue.reverse();
            state.mystery.activeMs = 6000;
        },
        () => {
            state.mystery.activeLabel = TEXT.game.mysteryEvents.garbage;
            makeGarbage(state.arena, 1, { rng: state.rng });
            state.garbageCells = countGarbageCells(state.arena);
            state.mystery.activeMs = 6000;
        },
    ];
    events[Math.floor(state.rng() * events.length)]();
    state.mystery.events++;
    state.mystery.nextInMs = 30000;
    if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
    state.mystery.warningShown = false;
    showBoardFeedback(TEXT.game.mystery(state.mystery.activeLabel), backToBackText(false), "warning", 1500);
    refreshComboBanner();
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

function comboValue(comboCount) {
    return comboCount > 0 ? TEXT.game.comboValue(comboCount + 1) : "0";
}

function totalStars() {
    return Object.values(data.stageStars).reduce((sum, stars) => sum + Number(stars || 0), 0);
}

function showProfile() {
    state.screen = "profile";
    state.demo = { enabled: false, move: null, stepMs: 0 };
    renderProfile();
    applyUiState();
}

function resetProfileRecords() {
    if (!window.confirm(TEXT.profile.resetConfirm)) return;
    resetRecords(data);
    renderProfile();
    buildModeMenu();
    applyUiState();
}

function renderProfile() {
    const totals = data.totals;
    const averagePps = totals.pieces / Math.max(totals.playTimeMs / 1000, 1);
    const summary = [
        [TEXT.profile.summary.games, totals.games],
        [TEXT.profile.summary.time, formatTime(totals.playTimeMs)],
        [TEXT.profile.summary.bestScore, Math.max(...Object.values(data.bestScores).filter(value => typeof value === "number"), 0)],
        [TEXT.profile.summary.bestSprint, data.bestScores.sprint?.elapsedMs ? formatPreciseTime(data.bestScores.sprint.elapsedMs) : "-"],
        [TEXT.profile.summary.averagePps, averagePps.toFixed(2)],
        [TEXT.profile.summary.tetris, totals.tetris],
        [TEXT.profile.summary.maxCombo, comboValue(totals.maxCombo)],
        [TEXT.profile.summary.stars, TEXT.game.valueSlashTotal(totalStars(), STAGES.length * 3)],
    ];
    elements.profileSummary.innerHTML = `
        <table class="profile-table">
            <tbody>
                ${summary.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join("")}
            </tbody>
        </table>
    `;
    const achievements = Object.keys(data.achievements);
    elements.achievementList.innerHTML = ACHIEVEMENT_IDS.map(id => {
        const unlocked = achievements.includes(id);
        const progress = describeAchievementProgress(id, data, { maxCombo: totals.maxCombo });
        const label = achievementLabel(id);
        const suffix = progress && !unlocked ? ` <small>${progress.display}</small>` : "";
        return `<li data-state="${unlocked ? "unlocked" : "locked"}"><span>${label}${suffix}</span></li>`;
    }).join("") || `<li>${TEXT.profile.emptyAchievements}</li>`;
    elements.replayList.innerHTML = data.recentReplays.length
        ? `
            <li class="replay-row replay-head"><span>${TEXT.profile.replayHead.mode}</span><span>${TEXT.profile.replayHead.result}</span><span>${TEXT.profile.replayHead.score}</span><span>${TEXT.profile.replayHead.seed}</span></li>
            ${data.recentReplays.map(replay => `
                <li class="replay-row">
                    <span>${MODES[replay.mode]?.label || replay.mode}</span>
                    <span>${resultText(replay.result.result)}</span>
                    <span>${replay.result.score}</span>
                    <span>${replay.seed}</span>
                </li>
            `).join("")}
        `
        : `<li>${TEXT.profile.emptyReplays}</li>`;
}

function resultText(result) {
    if (result === "success") return TEXT.status.success;
    if (result === "failed") return TEXT.status.failed;
    if (result === "playing") return TEXT.status.playing;
    return result;
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

function renderPauseSummary() {
    if (!elements.pauseSummary) return;
    const progress = MODES[state.mode]?.progress(state) || { value: "-" };
    elements.pauseSummary.textContent = pauseSummaryText(progress.value);
    if (elements.pauseFocusValue) {
        elements.pauseFocusValue.textContent = joinText([
            `${TEXT.hud.score} ${state.score}`,
            `${TEXT.hud.lines} ${state.lines}`,
            `${TEXT.hud.level} ${state.level}`,
        ]);
    }
    if (elements.pauseInputValue) {
        elements.pauseInputValue.textContent = joinText([
            `DAS ${Math.round(state.settings.dasMs)}ms`,
            `ARR ${Math.round(state.settings.arrMs)}ms`,
            `Hold ${state.rules.noHold ? "off" : "on"}`,
        ]);
    }
    if (elements.pauseExitValue) {
        elements.pauseExitValue.textContent = joinText([
            `${TEXT.result.fields.time} ${formatTime(state.elapsedMs)}`,
            progress.value,
        ]);
    }
}

function showBoardFeedback(title, detail = "", tone = "combo", duration = 1200) {
    if (!elements.feedbackOverlay || !elements.feedbackTitle || !elements.feedbackDetail) return;
    elements.feedbackOverlay.hidden = false;
    elements.feedbackOverlay.setAttribute("aria-hidden", "false");
    elements.feedbackTitle.textContent = title || "";
    elements.feedbackDetail.textContent = detail || "";
    if (elements.feedbackTag) elements.feedbackTag.textContent = feedbackTag(tone);
    elements.feedbackOverlay.dataset.state = "active";
    elements.feedbackOverlay.dataset.tone = tone;
    if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
    if (boardFeedbackTimer) clearTimeout(boardFeedbackTimer);
    boardFeedbackTimer = window.setTimeout(() => {
        elements.feedbackOverlay.dataset.state = "idle";
        elements.feedbackOverlay.dataset.tone = "";
        if (elements.feedbackTag) elements.feedbackTag.textContent = TEXT.feedback.combo;
        elements.feedbackTitle.textContent = TEXT.feedback.readyPrimary;
        elements.feedbackDetail.textContent = TEXT.feedback.readySecondary;
        if (elements.feedbackTimer) elements.feedbackTimer.hidden = true;
        syncFeedbackOverlayState();
    }, duration);
    if (tone === "big") pulseBoardShake();
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

function pauseSummaryText(progressValue) {
    if (typeof TEXT.pause.summaryStats === "function") {
        return TEXT.pause.summaryStats(MODES[state.mode]?.label || "", progressValue);
    }
    return `${MODES[state.mode]?.label || ""} • ${progressValue}`;
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
