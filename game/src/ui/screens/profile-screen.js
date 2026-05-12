import { TEXT } from "../../i18n.js?v=__APP_VERSION__";
import { STAGES, MODES, formatPreciseTime, formatTime } from "../../modes.js?v=__APP_VERSION__";
import { ACHIEVEMENT_IDS, achievementLabel, describeAchievementProgress } from "../../progression.js?v=__APP_VERSION__";

export function renderProfileScreen(data, elements) {
    const totals = data.totals;
    const hasHistory = totals.games > 0 || (data.recentReplays && data.recentReplays.length > 0);
    const averagePps = totals.pieces / Math.max(totals.playTimeMs / 1000, 1);
    const summary = [
        [TEXT.profile.summary.games, totals.games],
        [TEXT.profile.summary.time, formatTime(totals.playTimeMs)],
        [TEXT.profile.summary.bestScore, Math.max(...Object.values(data.bestScores).filter(value => typeof value === "number"), 0)],
        [TEXT.profile.summary.bestSprint, data.bestScores.sprint?.elapsedMs ? formatPreciseTime(data.bestScores.sprint.elapsedMs) : "-"],
        [TEXT.profile.summary.averagePps, averagePps.toFixed(2)],
        [TEXT.profile.summary.tetris, totals.tetris],
        [TEXT.profile.summary.maxCombo, totals.maxCombo > 0 ? TEXT.game.comboValue(totals.maxCombo + 1) : "0"],
        [TEXT.profile.summary.stars, TEXT.game.valueSlashTotal(totalStars(data), STAGES.length * 3)],
    ];

    if (!hasHistory) {
        elements.profileSummary.innerHTML = `
            <p class="profile-empty-state">${TEXT.profile.emptyProfile}</p>
            <p class="profile-grid-note">${TEXT.profile.startHint}</p>
        `;
    } else {
        elements.profileSummary.innerHTML = `
            <table class="profile-table">
                <tbody>
                    ${summary.map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`).join("")}
                </tbody>
            </table>
        `;
    }

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

function totalStars(data) {
    return Object.values(data.stageStars).reduce((sum, stars) => sum + Number(stars || 0), 0);
}

function resultText(result) {
    if (result === "success") return TEXT.status.success;
    if (result === "failed") return TEXT.status.failed;
    if (result === "playing") return TEXT.status.playing;
    return result;
}
