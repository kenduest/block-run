import { TEXT } from "../i18n.js?v=__APP_VERSION__";

export function renderResultScreen(state, viewModel, elements) {
    const stats = viewModel.isGameOver
        ? [
            [TEXT.result.fields.score, viewModel.score],
            [TEXT.result.fields.lines, viewModel.lines],
            [TEXT.result.fields.level, viewModel.level],
            [TEXT.result.fields.time, viewModel.timeLabel],
        ]
        : [
            [TEXT.result.fields.score, viewModel.score],
            [TEXT.result.fields.best, viewModel.best],
            [TEXT.result.fields.lines, viewModel.lines],
            [TEXT.result.fields.level, viewModel.level],
            [TEXT.result.fields.maxCombo, viewModel.maxCombo > 0 ? TEXT.game.comboValue(viewModel.maxCombo + 1) : "0"],
            [TEXT.result.fields.time, viewModel.timeLabel],
            [TEXT.result.fields.pps, viewModel.pps],
            [TEXT.result.fields.kpp, viewModel.kpp],
        ];

    if (state.mode === "stages" && viewModel.stageStars) {
        stats.push([TEXT.result.fields.stars, viewModel.stageStars]);
    }

    elements.resultLabel.textContent = viewModel.isGameOver ? TEXT.result.labelGameOver : TEXT.result.label;
    elements.resultTitle.textContent = viewModel.isSuccess
        ? TEXT.result.success
        : viewModel.isGameOver
            ? TEXT.result.gameOver
            : TEXT.result.done;
    elements.resultStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    if (elements.resultComparison) {
        if (viewModel.comparison && viewModel.comparison.rows.length) {
            elements.resultComparison.hidden = false;
            elements.resultComparison.innerHTML = `
                <div class="result-comparison">
                    <p class="result-comparison-title">${viewModel.comparison.title}</p>
                    ${viewModel.comparison.rows.join("")}
                </div>
            `;
        } else {
            elements.resultComparison.hidden = false;
            elements.resultComparison.innerHTML = `<p class="result-empty-comparison">${TEXT.result.comparisonNone}</p>`;
        }
    }

    if (elements.resultGrade) {
        elements.resultGrade.textContent = viewModel.grade;
        elements.resultGrade.dataset.grade = viewModel.gradeState;
    }
    if (elements.resultGradeHint) elements.resultGradeHint.textContent = viewModel.gradeHint;

    if (elements.resultRecordBadge) {
        elements.resultRecordBadge.dataset.state = viewModel.badgeState;
        const badgeValue = elements.resultRecordBadge.querySelector("strong");
        if (badgeValue) badgeValue.textContent = viewModel.badgeText;
    }

    elements.achievementNotice.textContent = viewModel.achievementNotice;

    let gameoverHint = document.getElementById("gameoverHint");
    if (!gameoverHint) {
        gameoverHint = document.createElement("p");
        gameoverHint.id = "gameoverHint";
        gameoverHint.className = "gameover-hint";
        elements.resultStats.parentNode.insertBefore(gameoverHint, elements.resultStats.nextSibling);
    }
    gameoverHint.textContent = viewModel.replayHint;
    document.getElementById("improvementTips")?.remove();
}
