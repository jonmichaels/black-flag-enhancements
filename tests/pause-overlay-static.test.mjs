import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("pause overlay generated module", () => {
  it("preserves existing pause overlay contract", () => {
    const dist = fs.readFileSync("dist/module.js", "utf8");
    expect(dist).toContain("black-flag-enhancements");
    expect(dist).toContain("pause-overlay-enabled");
    expect(dist).toContain("pause-overlay-image");
    expect(dist).toContain("renderGamePause");
    expect(dist).toContain("assets/black_flag_icon.webp");
  });
});
