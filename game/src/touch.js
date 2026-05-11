export const BOARD_DOUBLE_TAP_MS = 260;
export const BOARD_DOUBLE_TAP_DISTANCE = 32;
export const BOARD_SWIPE_DISTANCE = 30;

export function resolveBoardTapAction(clientX, rectLeft, rectWidth) {
    const midpoint = rectLeft + (rectWidth / 2);
    return clientX < midpoint ? "left" : "right";
}

export function isBoardDoubleTap(previousTap, nextTap, {
    maxDelay = BOARD_DOUBLE_TAP_MS,
    maxDistance = BOARD_DOUBLE_TAP_DISTANCE,
} = {}) {
    if (!previousTap) return false;
    const deltaMs = nextTap.time - previousTap.time;
    if (deltaMs < 0 || deltaMs > maxDelay) return false;
    const deltaX = nextTap.x - previousTap.x;
    const deltaY = nextTap.y - previousTap.y;
    return Math.hypot(deltaX, deltaY) <= maxDistance;
}

export function resolveBoardSwipeAction(startTap, endTap, {
    minDistance = BOARD_SWIPE_DISTANCE,
} = {}) {
    if (!startTap || !endTap) return null;
    const deltaX = endTap.x - startTap.x;
    const deltaY = endTap.y - startTap.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (Math.max(absX, absY) < minDistance) return null;
    if (absX > absY) return deltaX < 0 ? "left" : "right";
    return deltaY < 0 ? "drop" : "down";
}
