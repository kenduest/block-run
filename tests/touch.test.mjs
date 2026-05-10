import assert from "node:assert/strict";
import {
    BOARD_DOUBLE_TAP_DISTANCE,
    BOARD_DOUBLE_TAP_MS,
    isBoardDoubleTap,
    resolveBoardTapAction,
} from "../game/src/touch.js";

assert.equal(resolveBoardTapAction(20, 10, 100), "left");
assert.equal(resolveBoardTapAction(60, 10, 100), "right");
assert.equal(resolveBoardTapAction(110, 10, 100), "right");

const firstTap = { x: 120, y: 220, time: 1000 };
const nearSecondTap = {
    x: 120 + BOARD_DOUBLE_TAP_DISTANCE - 2,
    y: 220,
    time: 1000 + BOARD_DOUBLE_TAP_MS - 10,
};
assert.equal(isBoardDoubleTap(firstTap, nearSecondTap), true);

const lateTap = { x: 120, y: 220, time: 1000 + BOARD_DOUBLE_TAP_MS + 1 };
assert.equal(isBoardDoubleTap(firstTap, lateTap), false);

const farTap = { x: 120 + BOARD_DOUBLE_TAP_DISTANCE + 2, y: 220, time: 1100 };
assert.equal(isBoardDoubleTap(firstTap, farTap), false);

assert.equal(isBoardDoubleTap(null, nearSecondTap), false);
