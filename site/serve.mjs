// Local preview of the configurator: builds the site and serves it, rebuilding
// on every page load, so editing site/ or src/ only needs a browser refresh.
//   node site/serve.mjs [port=8080]

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = join(here, "..", "_site");
const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };

const build = () => execFileSync(process.execPath, [join(here, "build.mjs"), out], { stdio: "inherit" });
build();

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (path.endsWith("/")) path += "index.html";
  try {
    if (path === "/index.html") build();
    const file = join(out, normalize(path).replace(/^([/\\]*\.\.)+/, ""));
    if (!file.startsWith(out)) throw new Error("outside the site");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`configurator: http://localhost:${port}/`));
