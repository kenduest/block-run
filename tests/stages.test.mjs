import assert from "node:assert/strict";
import { STAGES } from "../src/modes.js";

assert.ok(STAGES.length >= 18);
assert.ok(new Set(STAGES.map(stage => stage.difficulty)).size >= 3);
assert.ok(new Set(STAGES.map(stage => stage.chapter)).size >= 6);
assert.ok(STAGES.some(stage => stage.objective.type === "score"));
assert.ok(STAGES.some(stage => stage.objective.type === "tetris"));
assert.ok(STAGES.some(stage => stage.timeLimitMs));
assert.ok(STAGES.some(stage => stage.pieceLimit));
assert.ok(STAGES.some(stage => stage.startingGarbage >= 4));
assert.ok(STAGES.some(stage => stage.speedEvents?.some(event => event.afterMs > 0 && event.multiplier < 1)));
assert.ok(STAGES.some(stage => stage.modifiers?.noHold));
assert.ok(STAGES.some(stage => stage.modifiers?.zoneMeter));
