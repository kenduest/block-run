import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "game");
const OUTPUT_DIR = path.join(ROOT, "dist", "pages");
const PLACEHOLDER = "__APP_VERSION__";
const VERSION = process.env.APP_VERSION || "dev";
const TEXT_FILE_RE = /\.(html|css|js)$/u;

function ensureCleanDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
}

function copyDir(sourceDir, targetDir) {
    fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function replaceVersionTokens(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            replaceVersionTokens(fullPath);
            continue;
        }
        if (!TEXT_FILE_RE.test(entry.name)) continue;
        const source = fs.readFileSync(fullPath, "utf8");
        fs.writeFileSync(fullPath, source.replaceAll(PLACEHOLDER, VERSION));
    }
}

ensureCleanDir(OUTPUT_DIR);
copyDir(SOURCE_DIR, OUTPUT_DIR);
replaceVersionTokens(OUTPUT_DIR);
console.log(`prepared ${path.relative(ROOT, OUTPUT_DIR)} with version ${VERSION}`);
