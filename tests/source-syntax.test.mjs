import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".js") ? [path] : [];
  });
}

describe("source syntax", () => {
  it("all source modules parse as JavaScript", () => {
    for (const file of sourceFiles("src")) {
      expect(() => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" })).not.toThrow();
    }
  });
});
