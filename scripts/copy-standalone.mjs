// copy-standalone.mjs — cross-platform post-build step for `output: "standalone"`.
// `next build` produces a self-contained server in .next/standalone, but it does
// NOT copy static assets inside it. This script finishes the bundle so
// `node .next/standalone/server.js` serves CSS/JS/images correctly.
// (Replaces the old `cp -r` shell hack so it works on Windows, macOS, Linux, Docker.)
import { cpSync, existsSync } from "node:fs";

cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });

if (existsSync("public")) {
  cpSync("public", ".next/standalone/public", { recursive: true });
}

console.log("[build] static assets copied into .next/standalone ✓");
