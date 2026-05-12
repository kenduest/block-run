import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME_DIR = path.join(ROOT, "game");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8766);
const VERSION = process.env.APP_VERSION || `dev-${Date.now()}`;
const TEXT_FILE_RE = /\.(html|css|js)$/u;
const MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
};

function resolveRequestPath(url = "/") {
    const pathname = decodeURIComponent(new URL(url, `http://${HOST}:${PORT}`).pathname);
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/u, "");
    const resolved = path.resolve(GAME_DIR, relativePath);
    if (!resolved.startsWith(`${GAME_DIR}${path.sep}`) && resolved !== GAME_DIR) return null;
    return resolved;
}

function send(response, statusCode, body, headers = {}) {
    response.writeHead(statusCode, headers);
    response.end(body);
}

function serveFile(filePath, response) {
    let stats;
    try {
        stats = fs.statSync(filePath);
    } catch {
        send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
        return;
    }

    const finalPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const ext = path.extname(finalPath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    try {
        if (TEXT_FILE_RE.test(finalPath)) {
            const body = fs.readFileSync(finalPath, "utf8").replaceAll("__APP_VERSION__", VERSION);
            send(response, 200, body, {
                "Cache-Control": "no-store",
                "Content-Type": contentType,
            });
            return;
        }

        send(response, 200, fs.readFileSync(finalPath), {
            "Cache-Control": "no-store",
            "Content-Type": contentType,
        });
    } catch {
        send(response, 500, "Server error\n", { "Content-Type": "text/plain; charset=utf-8" });
    }
}

const server = http.createServer((request, response) => {
    const filePath = resolveRequestPath(request.url);
    if (!filePath) {
        send(response, 403, "Forbidden\n", { "Content-Type": "text/plain; charset=utf-8" });
        return;
    }
    serveFile(filePath, response);
});

server.listen(PORT, HOST, () => {
    console.log(`Serving Block Run from game at http://${HOST}:${PORT}/`);
    console.log(`Using app version ${VERSION}`);
});
