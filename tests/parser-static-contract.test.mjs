import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = p => fs.readFileSync(p, "utf8");

describe("static parser contract", () => {
  it("registers parser settings and localization", () => {
    const settings = read("src/settings.js");
    const constants = read("src/constants.js");
    expect(constants).toContain("parser-enabled");
    expect(constants).toContain("suppress-black-flag-tools-parser");
    expect(settings).toMatch(/scope:\s*"world"/);
    expect(settings).toMatch(/type:\s*Boolean/);
    expect(settings).toMatch(/default:\s*true/);
    expect(read("lang/en.json")).toContain("Enable Content Parser");
    expect(settings).toContain("Enable Content Parser");
    expect(settings).toContain("Hide Black Flag Tools Parser");
    expect(read("module.json")).toContain("lang/en.json");
  });
  it("wires ApplicationV2 parser UI and BFE-specific button", () => {
    const app = read("src/parser/parsing-application.js");
    expect(app).toContain("HandlebarsApplicationMixin(ApplicationV2)");
    expect(app).toContain("black-flag-enhancements");
    expect(app).toContain("parser");
    expect(app).toContain("templates/parser/input.hbs");
    expect(app).toContain("metadata?.type !== \"Item\"");
    expect(app).toContain("pack.locked");
    expect(app).toContain("bfe-parse");
    expect(app).toContain("BFE Parser");
    expect(app).toContain("grantFeatures");
    expect(read("src/parser/parse-input.js")).toContain('groupFallback: "Character"');
    expect(read("src/parser/common-traits.js")).toContain("system.traits.senses.types.darkvision");
    for (const type of ["lineage","heritage","background","talent","spell"]) expect(read("src/parser/parse-input.js")).toContain(`case \"${type}\"`);
  });
  it("has no runtime dependency on black-flag-tools parser source", () => {
    for (const file of ["src/module.js", "src/parser/parse-input.js", "src/parser/parsing-application.js"]) expect(read(file)).not.toMatch(/black-flag-tools\.mjs|\/Data\/modules\/black-flag-tools|modules\/black-flag-tools/);
  });
});
