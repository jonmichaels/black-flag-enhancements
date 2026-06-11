import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("README parser docs", () => {
  it("documents parser settings and supported types", () => {
    const text = fs.readFileSync("README.md", "utf8");
    for (const term of ["Content Parser", "spells", "magic items", "lineages", "heritages", "backgrounds", "talents", "Enable Content Parser", "Hide Black Flag Tools Parser", "Black Flag Tools"]) expect(text).toContain(term);
  });
});
