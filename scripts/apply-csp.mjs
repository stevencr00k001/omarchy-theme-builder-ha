import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = "out";
const hashes = new Set();

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "_next") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (name.endsWith(".html")) {
      const html = readFileSync(path, "utf8");
      for (const match of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
        const body = match[1];
        if (!body.trim()) continue;
        const digest = createHash("sha256").update(body, "utf8").digest("base64");
        hashes.add(`'sha256-${digest}'`);
      }
    }
  }
}

walk(root);
const scriptSrc = ["'self'", ...hashes].join(" ");
const policy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://raw.githubusercontent.com blob: data:",
  "font-src 'self'",
  "connect-src 'self' https://raw.githubusercontent.com https: wss:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const headersPath = join(root, "_headers");
let headers = readFileSync(headersPath, "utf8");
if (!headers.includes("Content-Security-Policy:")) {
  headers = headers.replace("/*\n", `/*\n  Content-Security-Policy: ${policy}\n`);
  writeFileSync(headersPath, headers);
}
console.log(`CSP script hashes: ${hashes.size}`);
