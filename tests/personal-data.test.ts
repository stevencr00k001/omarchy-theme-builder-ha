import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKIP = new Set(["node_modules", ".next", "out", ".git", "coverage"]);
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name === "frontend") continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, found);
    else if (
      /\.(tsx?|css|md|json|toml|mjs|txt|html)$/.test(name) &&
      name !== "package-lock.json" &&
      name !== "personal-data.test.ts"
    ) {
      found.push(path);
    }
  }
  return found;
}

describe("repository text", () => {
  it("does not contain an email address, business number, or phone number", () => {
    const hits: string[] = [];
    for (const path of walk(process.cwd())) {
      const text = readFileSync(path, "utf8");
      const businessNumber = ["A", "B", "N"].join("");
      const flagged =
        EMAIL.test(text) ||
        new RegExp(`\\b${businessNumber}\\b`).test(text) ||
        /\b\d{4}\s\d{3}\s\d{3}\b/.test(text);
      if (flagged) {
        hits.push(path);
      }
    }
    expect(hits).toEqual([]);
  });
});
