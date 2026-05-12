import { TEXT, joinText } from "../../i18n.js?v=__APP_VERSION__";

export function renderPauseSummary(state, elements, deps = {}) {
    if (!elements.pauseSummary) return;
    const modeData = deps.MODES || null;
    const source = deps.TEXT || TEXT;
    const join = deps.joinText || joinText;
    const progress = modeData?.[state.mode]?.progress?.(state) || { value: "-" };

    if (typeof source?.pause?.summaryStats === "function") {
        elements.pauseSummary.textContent = source.pause.summaryStats({
            mode: modeData?.[state.mode]?.label || "",
            progress: progress.value,
            score: state.score,
        });
        return;
    }

    elements.pauseSummary.textContent = join([modeData?.[state.mode]?.label || "", progress.value, `${source.hud.score} ${state.score}`]);
}
