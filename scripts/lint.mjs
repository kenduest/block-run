// Minimal hand-rolled linter — catches common smells without requiring an npm dep.
// Run with `make lint` (or directly via node scripts/lint.mjs).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
    path.join(ROOT, "game", "src"),
    path.join(ROOT, "scripts"),
    path.join(ROOT, "tests"),
];

const violations = [];

function collectFiles(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) collectFiles(full, out);
        else if (entry.isFile() && (/\.(?:m?js)$/u).test(entry.name)) out.push(full);
    }
    return out;
}

function checkFile(file) {
    const source = fs.readFileSync(file, "utf8");
    const lines = source.split(/\r?\n/u);
    const relative = path.relative(ROOT, file);
    // The linter itself encodes the very patterns it forbids in its rule regexes,
    // so don't lint its own source — that'd be noise, not signal.
    const isSelfFile = relative === "scripts/lint.mjs";

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        // Strip line comments, string literals, and regex literals to reduce false positives.
        const stripped = stripCommentsAndStrings(line);
        // Allow `== null` / `!= null` (idiom for "null or undefined").
        const stripForEquality = stripped.replace(/[!=]=\s*null\b/gu, "");

        // 1. Disallow `==` / `!=` (use ===/!==).
        if (!isSelfFile && /(?<![=!<>])[!=]=(?!=)/u.test(stripForEquality)) {
            violations.push(`${relative}:${lineNumber}: use === / !== (found loose equality)`);
        }
        // 2. Disallow var declarations.
        if (/(^|[^.\w])var\s+[A-Za-z_$]/u.test(stripped)) {
            violations.push(`${relative}:${lineNumber}: use let or const instead of var`);
        }
        // 3. Disallow `console.log` in source (but allow in scripts/* and tests/*).
        if (/\bconsole\s*\.\s*log\b/u.test(stripped)) {
            if (relative.startsWith("game/src")) {
                violations.push(`${relative}:${lineNumber}: leftover console.log in production code`);
            }
        }
        // 4. Disallow `debugger;`
        if (/\bdebugger\b/u.test(stripped)) {
            violations.push(`${relative}:${lineNumber}: debugger statement`);
        }
        // 5. Trailing whitespace (cosmetic, but cheap to fix).
        if (/[ \t]+$/u.test(line)) {
            violations.push(`${relative}:${lineNumber}: trailing whitespace`);
        }
    });
}

function stripCommentsAndStrings(line) {
    let out = "";
    let i = 0;
    while (i < line.length) {
        const ch = line[i];
        const next = line[i + 1];
        if (ch === "/" && next === "/") break;
        if (ch === '"' || ch === "'" || ch === "`") {
            const quote = ch;
            i++;
            while (i < line.length && line[i] !== quote) {
                if (line[i] === "\\") i++;
                i++;
            }
            i++;
            out += " ";
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

for (const target of TARGETS) {
    for (const file of collectFiles(target)) checkFile(file);
}

if (violations.length) {
    for (const v of violations) console.error(v);
    console.error(`\nlint failed: ${violations.length} issue${violations.length === 1 ? "" : "s"}`);
    process.exit(1);
}
console.log("lint passed");
