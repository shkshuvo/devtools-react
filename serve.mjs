import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
const root = fileURLToPath(new URL("./dist/", import.meta.url));
if (!existsSync(resolve(root, "index.html"))) {
  console.error("Missing build. Run npm ci and npm run build first.");
  process.exit(1);
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".wasm": "application/wasm",
};
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const path = resolve(
      root,
      "." + (pathname === "/" ? "/index.html" : pathname),
    );
    if (
      !path.startsWith(resolve(root) + sep) ||
      !["GET", "HEAD"].includes(req.method)
    ) {
      res.writeHead(403).end();
      return;
    }
    if (!(await stat(path)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(path)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    if (req.method === "HEAD") res.end();
    else
      createReadStream(path)
        .on("error", () => res.destroy())
        .pipe(res);
  } catch {
    res.writeHead(404).end("File unavailable");
  }
});
let port = Number(process.env.PORT || 4173);
server.on("error", (e) => {
  if (e.code === "EADDRINUSE" && port < 65535) {
    server.listen(++port, "127.0.0.1");
  } else {
    console.error(e.message);
    process.exit(1);
  }
});
server.on("listening", () => {
  const url = "http://127.0.0.1:" + server.address().port;
  console.log(
    "DevTools is running at " +
      url +
      "\nKeep this window open. Press Ctrl+C to stop.",
  );
  if (process.platform === "win32" && process.argv.includes("--open"))
    spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
      detached: true,
      stdio: "ignore",
    }).unref();
});
server.listen(port, "127.0.0.1");
