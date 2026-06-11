import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = p => fs.readFileSync(p, "utf8");

describe("parser UI contract", () => {
  it("uses Black Flag Tools parser structure as baseline", () => {
    expect(read("templates/parser/input.hbs")).toContain('<textarea name="input"');
    const output = read("templates/parser/output.hbs");
    expect(output).toContain("{{{ preview }}}");
    const footer = read("templates/parser/footer.hbs");
    expect(footer).toContain("formInput types.field");
    expect(footer).toContain("formInput folders.field");
    expect(footer).toContain("heavy-button");
  });

  it("ships BFT-style parser layout CSS under BFE selector", () => {
    const css = read("dist/module.css");
    expect(css).toContain(".black-flag-enhancements.parser .window-content");
    expect(css).toContain('grid-template-areas:');
    expect(css).toContain('"input output"');
    expect(css).toContain('[data-application-part="input"] textarea');
    expect(css).toContain('[data-application-part="output"]');
    expect(css).toContain('[data-application-part="footer"]');
    expect(css).toContain("var(--bf-background-color-half-white)");
    expect(css).toContain("var(--bf-color-border-blue)");
  });

  it("does not expose raw BFE localization keys in templates or settings labels", () => {
    const humanFacing = [
      read("src/settings.js"),
      read("src/parser/parsing-application.js"),
      read("templates/parser/input.hbs"),
      read("templates/parser/footer.hbs"),
      read("templates/parser/output.hbs")
    ].join("\n");
    expect(humanFacing).not.toContain("BFE.Settings.ParserEnabled.Name");
    expect(humanFacing).not.toContain("BFE.Settings.SuppressBlackFlagToolsParser.Name");
    expect(humanFacing).not.toContain("BFE.Parser.Save");
    expect(humanFacing).toContain("BFE Parser");
    expect(humanFacing).toContain("Save");
  });

  it("shows related feature names only in parser preview", () => {
    const template = read("templates/parser/types/concept-output.hbs");
    expect(template).toContain("Related Features");
    expect(template).not.toMatch(/description\.value/);
    expect(template).not.toContain("related-feature-description");
  });
});
