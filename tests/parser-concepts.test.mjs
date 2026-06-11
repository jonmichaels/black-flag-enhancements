import { describe, expect, it } from "vitest";
import { parseInput } from "../src/parser/parse-input.js";
import { removeBlackFlagToolsParserButton } from "../src/parser/black-flag-tools-interop.js";
import { Window } from "happy-dom";

describe("concept parsers", () => {
  it("parses lineage with related feature items and embed placeholders", () => {
    const result = parseInput("lineage", `Dhampir\nLineage Traits\nAge. You age normally.\nSize. Your size is Medium or Small.\nSpeed. Your base walking speed is 30 feet.\nDarkvision. You have darkvision to 60 feet.\nBite. Your fanged bite is a natural weapon.`);
    expect(result.primary.type).toBe("lineage");
    expect(result.primary.name).toBe("Dhampir");
    expect(result.primary.system.description.value).toContain("<h5>Lineage Traits</h5>");
    expect(result.related.map(i => i.type)).toEqual(["feature", "feature"]);
    expect(result.related.map(i => i.name)).toEqual(["Darkvision", "Bite"]);
    expect(result.primary.system.description.value).toContain("@@BFE_EMBED:Darkvision@@");
  });

  it("parses heritage/background/talent as valid Black Flag item types", () => {
    expect(parseInput("heritage", "Aerobat\nYou are at home in high places.\nDescender. You can slow your fall.").primary.type).toBe("heritage");
    expect(parseInput("background", "Vampire Hunter\nYou hunt creatures of the night.\nSkill Proficiencies: Choose two.\nEquipment: A stake.\nTalent: Choose one martial talent.").primary.type).toBe("background");
    const talent = parseInput("talent", "Alert\nMartial Talent\nPrerequisite: None\nBenefit. You gain a +5 bonus to initiative.").primary;
    expect(talent.type).toBe("talent");
    expect(talent.system.type.category).toBe("martial");
  });

  it("keeps existing parser types available", () => {
    for (const type of ["spell","ammunition","armor","weapon","enchantment","consumable","container","gear","staff"]) {
      expect(parseInput(type, "Sample Name\nMagic Item\nDescription here.").primary.name).toBe("Sample Name");
    }
  });
});

describe("black flag tools interop", () => {
  it("removes only the BFT parser button", () => {
    const window = new Window();
    const root = window.document.createElement("div");
    root.innerHTML = `<div class="header-actions"><button class="parse" data-action="parse">Parse Document</button><button class="bfe-parse" data-action="bfe-parse">Parse Document</button><button data-action="x">Other</button></div>`;
    expect(removeBlackFlagToolsParserButton(root, { bftTitle: "Parse Document" })).toBe(1);
    expect(root.querySelector(".bfe-parse")).toBeTruthy();
    expect(root.querySelector('[data-action="x"]')).toBeTruthy();
  });
});
