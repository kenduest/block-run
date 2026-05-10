import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GAME_DIR = path.join(ROOT, "game");
const DIST_DIR = path.join(ROOT, "dist");
const ENTRY_HTML = path.join(GAME_DIR, "index.html");
const ENTRY_JS = path.join(GAME_DIR, "src", "game.js");
const ENTRY_CSS = path.join(GAME_DIR, "styles.css");
const OUTPUT_HTML = path.join(DIST_DIR, "block-run-standalone.html");

const seen = new Set();
const orderedModules = [];

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function readFile(file) {
    return fs.readFileSync(file, "utf8");
}

function resolveImport(fromFile, specifier) {
    const clean = specifier.split("?")[0];
    return path.resolve(path.dirname(fromFile), clean);
}

function visitModule(file) {
    const resolved = path.resolve(file);
    if (seen.has(resolved)) return;
    seen.add(resolved);

    const source = readFile(resolved);
    const importMatches = [...source.matchAll(/^\s*import\s+[\s\S]*?from\s+["'](.+?)["'];?\s*$/gm)];
    for (const match of importMatches) {
        visitModule(resolveImport(resolved, match[1]));
    }
    orderedModules.push({ file: resolved, source });
}

function stripModuleSyntax(source) {
    return source
        .replace(/^\s*import\s+[\s\S]*?from\s+["'](.+?)["'];?\s*$/gm, "")
        .replace(/^export\s+(const|function|class)\s+/gm, "$1 ")
        .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, "");
}

function buildBundle() {
    visitModule(ENTRY_JS);
    return orderedModules
        .map(({ file, source }) => {
            const relative = path.relative(ROOT, file);
            const body = stripModuleSyntax(source).trim();
            return `/* ${relative} */\n${body}\n`;
        })
        .join("\n");
}

function buildHtml() {
    const html = readFile(ENTRY_HTML);
    const css = readFile(ENTRY_CSS).trim();
    const js = buildBundle().trim();

    return html
        .replace(/<link rel="stylesheet" href="\.\/styles\.css[^"]*">\s*/u, `<style>\n${css}\n</style>\n`)
        .replace(/<script type="module" src="\.\/src\/game\.js[^"]*"><\/script>\s*/u, `<script>\n${js}\n</script>\n`);
}

ensureDir(DIST_DIR);
fs.writeFileSync(OUTPUT_HTML, buildHtml());
console.log(`built ${path.relative(ROOT, OUTPUT_HTML)}`);
