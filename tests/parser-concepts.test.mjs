import { describe, expect, it } from "vitest";
import { parseInput } from "../src/parser/parse-input.js";
import { removeBlackFlagToolsParserButton } from "../src/parser/black-flag-tools-interop.js";
import { Window } from "happy-dom";

describe("concept parsers", () => {
  it("parses lineage with related feature items and plain trait descriptions", () => {
    const result = parseInput("lineage", `Dhampir\nLineage Traits\nAge. You age normally.\nSize. Your size is Medium or Small.\nSpeed. Your base walking speed is 30 feet.\nDarkvision. You have darkvision to 60 feet.\nBite. Your fanged bite is a natural weapon.`);
    expect(result.primary.type).toBe("lineage");
    expect(result.primary.name).toBe("Dhampir");
    expect(result.primary.img).toBe("systems/black-flag/artwork/types/lineage.svg");
    expect(result.primary.system.description.value).toContain("<h4>Dhampir Lineage Traits</h4>");
    expect(result.primary.system.advancement.bfeSize000000000.configuration.options).toEqual(["small", "medium"]);
    expect(result.primary.system.description.value).toContain("<em><strong>Size.</strong></em> Your size is Medium or Small.");
    expect(result.related.map(i => i.img)).toEqual(["icons/creatures/eyes/humanoid-single-blind.webp", "systems/black-flag/artwork/types/feature.svg"]);
    expect(result.related.map(i => i.type)).toEqual(["feature", "feature"]);
    expect(result.related.map(i => i.name)).toEqual(["Darkvision", "Bite"]);
    expect(result.related.map(i => i.system.type.category)).toEqual(["lineage", "lineage"]);
    expect(result.related[0].system.description.value).not.toContain("Darkvision");
    expect(result.primary.system.description.value).toContain("<em><strong>Darkvision.</strong></em> You have darkvision to 60 feet.");
    expect(result.primary.system.description.value).toContain("<em><strong>Bite.</strong></em> Your fanged bite is a natural weapon.");
  });

  it("cleans messy PDF lineage paste into description paragraphs and feature traits", () => {
    const result = parseInput("lineage", `stone born
Children of the mountains are sturdy
and patient. They remember old roads. Some
settlements call them granite folk.
STONE BORN LINEAGE TRAITS
Age.
Stone born mature at the same rate as humans
and live about a century.
Size.
Your size is Medium or Small.
Speed.
Your base walking speed is 30 feet.
Mountain Lore.
You gain proficiency in History
checks related to stonework and mountains.
Sure Footed.
You ignore difficult terrain caused
by rubble or uneven stone.`);
    const description = result.primary.system.description.value;
    expect(result.primary.name).toBe("Stone Born");
    expect(description).toContain("<p>Children of the mountains are sturdy and patient.</p>");
    expect(description).toContain("<p>They remember old roads.</p>");
    expect(description).toContain("<p>Some settlements call them granite folk.</p>");
    expect(description).toContain("<h4>Stone Born Lineage Traits</h4>");
    expect(description).toContain("<em><strong>Age.</strong></em> Stone born mature at the same rate as humans and live about a century.");
    expect(description).toContain("<em><strong>Mountain Lore.</strong></em> You gain proficiency in History checks related to stonework and mountains.");
    expect(description).toContain("<em><strong>Sure Footed.</strong></em> You ignore difficult terrain caused by rubble or uneven stone.");
    expect(result.related.map(i => i.name)).toEqual(["Mountain Lore", "Sure Footed"]);
    expect(result.related[0].system.description.value).toBe("<p>You gain proficiency in History checks related to stonework and mountains.</p>");
  });

  it("does not split coincidental capitalized sentence fragments into lineage traits", () => {
    const result = parseInput("lineage", `dryad
Dryads are forest spirits.
Dryad Lineage Traits
Age. Dryads age slowly.
Size. Your size is Medium.
Speed. Your base walking speed is 30 feet.
Natural Magic. Your innate connection to the natural
world gives you an affinity with plants and animals.
You know the druidcraft cantrip. In addition, you can
understand and verbally communicate with Beasts and
Plants. This works like the speak with animals spell, except it
also applies to Plants.
Tree Step. You can use 15 feet of your movement to step
into one living tree within your reach.`);
    expect(result.related.map(i => i.name)).toEqual(["Natural Magic", "Tree Step"]);
    expect(result.primary.system.description.value).toContain("Beasts and Plants. This works like the speak with animals spell");
    expect(result.primary.system.description.value).not.toContain("<em><strong>Plants.</strong></em>");
  });

  it("accepts lineage traits marker across split pastes and capitalization", () => {
    const result = parseInput("lineage", `half giant\nLarge travelers cross deserts\nand open plains.\n\nhalf giant lineage traits\nAge. You age normally.\nSize. Your size is Medium.\nSpeed. Your speed is 30 feet.\nPowerful Build. You count as one size larger\nwhen determining carrying capacity.`);
    expect(result.primary.name).toBe("Half Giant");
    expect(result.primary.system.description.value).toContain("Large travelers cross deserts and open plains.");
    expect(result.related.map(i => i.name)).toEqual(["Powerful Build"]);
  });

  it("only keeps age size and speed out of related lineage features", () => {
    const result = parseInput("lineage", `swift folk\nQuick and curious.\nSwift Folk Lineage Traits\nAge. You age normally.\nSize. Your size is Medium.\nSpeed. Your speed is 30 feet.\nLanguages. You speak Common and one other language.\nCreature Type. You are a Humanoid.`);
    expect(result.related.map(i => i.name)).toEqual(["Languages", "Creature Type"]);
    expect(result.primary.system.advancement.bfeSize000000000.configuration.options).toEqual(["medium"]);
  });

  it("creates darkvision lineage features with property advancement", () => {
    const result = parseInput("lineage", `night folk\nNight folk see in darkness.\nNight Folk Lineage Traits\nAge. You age normally.\nSize. Your size is Medium.\nSpeed. Your speed is 30 feet.\nDarkvision. You have darkvision to a range of 60 feet.`);
    const darkvision = result.related.find(i => i.name === "Darkvision");
    expect(darkvision.img).toBe("icons/creatures/eyes/humanoid-single-blind.webp");
    const advancement = Object.values(darkvision.system.advancement)[0];
    expect(advancement.type).toBe("property");
    expect(advancement.title).toBe("Darkvision");
    expect(advancement.hint).toBe("You have darkvision to a range of 60 feet.");
    expect(advancement.configuration.changes).toEqual([{ key: "system.traits.senses.types.darkvision", mode: 4, value: "60" }]);
    expect(result.primary.system.description.value).toContain("<em><strong>Darkvision.</strong></em> You have darkvision to a range of 60 feet.");
  });

  it("detects superior darkvision distance for reusable darkvision trait parsing", () => {
    const result = parseInput("lineage", `deep folk\nDeep folk live below.\nDeep Folk Lineage Traits\nAge. You age normally.\nSize. Your size is Medium.\nSpeed. Your speed is 30 feet.\nSuperior Darkvision. You have darkvision to a range of 120 feet.`);
    const darkvision = result.related.find(i => i.name === "Superior Darkvision");
    expect(darkvision.img).toBe("icons/creatures/eyes/humanoid-single-blind.webp");
    const advancement = Object.values(darkvision.system.advancement)[0];
    expect(advancement.configuration.changes[0].value).toBe("120");
  });

  it("parses small-only lineage size advancement", () => {
    const result = parseInput("lineage", `tiny folk\nTiny folk hide well.\nTiny Folk Lineage Traits\nAge. You age normally.\nSize. Your size is Small.\nSpeed. Your speed is 30 feet.`);
    expect(result.primary.system.advancement.bfeSize000000000.configuration.options).toEqual(["small"]);
  });

  it("preserves prose as description when lineage traits marker is missing", () => {
    const result = parseInput("lineage", `river kin\nRiver kin live along broad waterways\nand trade with everyone. They prize hospitality.`);
    expect(result.primary.name).toBe("River Kin");
    expect(result.primary.system.description.value).toContain("<p>River kin live along broad waterways and trade with everyone.</p>");
    expect(result.primary.system.description.value).toContain("<p>They prize hospitality.</p>");
    expect(result.related).toEqual([]);
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
