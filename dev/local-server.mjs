/* Local Termux/Node preview server for the Cloudflare Worker app.
 *
 * This is only for local UI development. The deployed app uses real D1, R2
 * and Durable Object bindings through Wrangler.
 */

import { serve } from "@hono/node-server";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../src/index.js";
import { AuthDO } from "../src/durable/auth-do.js";
import { TaskPoller } from "../src/durable/task-poller.js";
import { LocalD1 } from "./local-d1.mjs";
import { LocalR2 } from "./local-r2.mjs";
import { LocalNamespace } from "./local-do.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const STATE = path.join(ROOT, ".local-preview");

function readVars() {
  const file = path.join(ROOT, ".dev.vars");
  if (!existsSync(file)) {
    console.error("Missing .dev.vars. Copy .dev.vars.example to .dev.vars first.");
    process.exit(1);
  }
  const vars = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    vars[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return vars;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function staticResponse(request) {
  const url = new URL(request.url);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const file = path.resolve(PUBLIC, "." + pathname);
  if (file.startsWith(PUBLIC + path.sep) && existsSync(file) && statSync(file).isFile()) {
    return new Response(readFileSync(file), {
      headers: {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(readFileSync(path.join(PUBLIC, "index.html")), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function main() {
  const vars = readVars();
  const env = {
    ...vars,
    APP_ORIGIN: vars.APP_ORIGIN || "http://localhost:8787",
    ASSETS: null,
    DB: await LocalD1.create({
      file: path.join(STATE, "d1.sqlite"),
      migration: readFileSync(path.join(ROOT, "migrations", "0001_init.sql"), "utf8"),
    }),
    MEDIA: new LocalR2(path.join(STATE, "r2")),
  };
  env.AUTH = new LocalNamespace(AuthDO, env);
  env.TASKS = new LocalNamespace(TaskPoller, env);

  const ctx = { waitUntil: (promise) => promise, passThroughOnException() {} };
  const port = Number(vars.PORT || 8787);

  serve(
    {
      hostname: "0.0.0.0",
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/media/")) {
          return worker.fetch(request, env, ctx);
        }
        return staticResponse(request);
      },
    },
    (info) => {
      console.log(`\n  Spicy Studio local preview  ·  http://localhost:${info.port}`);
      console.log("  Local D1/R2/DO shims · real provider calls use keys saved in Settings");
      console.log("  Setup token: open .dev.vars\n");
    }
  );

  process.on("SIGINT", () => {
    env.DB.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
