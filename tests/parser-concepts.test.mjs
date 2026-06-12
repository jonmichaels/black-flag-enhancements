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

  it("parses heritage PDF text like lineage text with related heritage trait features", () => {
    const result = parseInput("heritage", `sky dancer
You were raised among cliff dwellers
and wind temples. Your people leap before they walk.
Glide.
You can slow your fall and drift
up to 30 feet horizontally. You land safely.
Languages.
You can speak, read, and write Common and Auran.
Cloud Step.
You can move across mist
as though it were solid ground.`);
    const description = result.primary.system.description.value;
    expect(result.primary.type).toBe("heritage");
    expect(result.primary.name).toBe("Sky Dancer");
    expect(result.primary.img).toBe("systems/black-flag/artwork/types/heritage.svg");
    expect(description).toContain("<p>You were raised among cliff dwellers and wind temples.</p>");
    expect(description).toContain("<p>Your people leap before they walk.</p>");
    expect(description).toContain("<em><strong>Glide.</strong></em> You can slow your fall and drift up to 30 feet horizontally. You land safely.");
    expect(description).toContain("<em><strong>Languages.</strong></em> You can speak, read, and write Common and Auran.");
    expect(description).toContain("<em><strong>Cloud Step.</strong></em> You can move across mist as though it were solid ground.");
    expect(result.related.map(i => i.name)).toEqual(["Glide", "Cloud Step"]);
    expect(result.related.map(i => i.type)).toEqual(["feature", "feature"]);
    expect(result.related.map(i => i.system.type.category)).toEqual(["heritage", "heritage"]);
    expect(result.related[0].system.description.value).toBe("<p>You can slow your fall and drift up to 30 feet horizontally. You land safely.</p>");
    expect(result.related[1].system.description.value).toBe("<p>You can move across mist as though it were solid ground.</p>");
    expect(result.primary.system.advancement.bfeLanguages0000.type).toBe("trait");
    expect(result.primary.system.advancement.bfeLanguages0000.title).toBe("Languages");
    expect(result.primary.system.advancement.bfeLanguages0000.configuration.grants).toEqual(["languages:standard:common"]);
    expect(result.primary.system.advancement.bfeLanguages0000.level.value).toBe(0);
    expect(result.primary.system.advancement.bfeLanguages0000.hint).toBe("You can speak, read, and write Common and Auran.");
  });

  it("parses Pine Scion style three-word heritage trait headings", () => {
    const result = parseInput("heritage", `pine scion
Pine scion heritage characters carry the best aspects of
the dryad communities into the world. They love the comforts of home.
Bark Eater. As long as there are pine trees in your
environment, you can provide enough food and water.
Scale the Branches. You have a climbing speed equal to
your walking speed. While climbing, you can take the Dash
action as a bonus action.
Woodcraft. You have proficiency in either the Nature or
Survival skill.
Languages. You know Common and one other language
of your choice.`);
    expect(result.primary.name).toBe("Pine Scion");
    expect(result.related.map(i => i.name)).toEqual(["Bark Eater", "Scale The Branches", "Woodcraft"]);
    expect(result.primary.system.description.value).toContain("<em><strong>Scale The Branches.</strong></em> You have a climbing speed equal to your walking speed. While climbing, you can take the Dash action as a bonus action.");
    expect(result.related[1].system.description.value).toBe("<p>You have a climbing speed equal to your walking speed. While climbing, you can take the Dash action as a bonus action.</p>");
    expect(result.primary.system.advancement.bfeLanguages0000.hint).toBe("You know Common and one other language of your choice.");
  });

  it("does not treat four-word heritage sentence starts as trait headings", () => {
    const result = parseInput("heritage", `ember scholar
Ember scholars study fire. Ancient Elemental Legacy Here.
This phrase should remain description until a short trait begins.
Fire Born.
You resist heat.`);
    expect(result.primary.name).toBe("Ember Scholar");
    expect(result.related.map(i => i.name)).toEqual(["Fire Born"]);
    expect(result.primary.system.description.value).toContain("<p>Ember scholars study fire.</p>");
    expect(result.primary.system.description.value).toContain("<p>Ancient Elemental Legacy Here.</p>");
    expect(result.primary.system.description.value).toContain("<p>This phrase should remain description until a short trait begins.</p>");
  });

  it("keeps Wastelander Mutations table with Beneficial Mutation and creates mutation features", () => {
    const result = parseInput("heritage", `WASTELANDER
Wastelander heritage characters have been raised to survive
in hostile, magically blasted wastes. They are tough as old
boot leather.
Beneficial Mutation. Your life in a magical wasteland has
caused your body to mutate. Choose a mutation from the
Wastelander Mutations table or roll a d6 to randomly
determine your mutation.
Slow Metabolism. You require only half the normal
amount of food and water.
Sufficiency. You have proficiency in either the Religion or
Survival skill.
Languages. You know Common and one additional
language of your choice. Typical wastelander heritage
characters choose Goblin.

WASTELANDER MUTATIONS
d6 Mutation
1 Alien Mind. You have advantage on saves against being charmed, and you are resistant to psychic damage.
2
Retractable Claws. As a bonus action, you can extend or retract claws into your fingertips.
3 Long Limbs. Your walking speed increases by 10 feet.
4 Temblor. You have tremorsense to a range of 10 feet.
5 Radiation Eater. You have advantage on saves against being poisoned, and you are resistant to poison damage.
6 Thickened Skin. You are resistant to acid, cold, fire, or lightning damage.`);
    expect(result.primary.name).toBe("Wastelander");
    expect(result.related.map(i => i.name)).toEqual([
      "Beneficial Mutation",
      "Slow Metabolism",
      "Sufficiency",
      "Alien Mind",
      "Retractable Claws",
      "Long Limbs",
      "Temblor",
      "Radiation Eater",
      "Thickened Skin"
    ]);
    expect(result.related[0].system.description.value).toContain("<h5>Wastelander Mutations</h5>");
    expect(result.related[0].system.description.value).toContain("<td>1</td>");
    expect(result.related[0].system.description.value).toContain("Alien Mind. You have advantage on saves against being charmed");
    expect(result.related[0].system.description.value).toContain("Retractable Claws. As a bonus action");
    const retractableClaws = result.related.find(i => i.name === "Retractable Claws");
    expect(retractableClaws.system.description.value).toContain("As a bonus action, you can extend or retract claws into your fingertips.");
    expect(retractableClaws.system.type.category).toBe("heritage");
    expect(retractableClaws.system.identifier.associated).toBe("wastelander");
    expect(retractableClaws.system.identifier.value).toBe("retractable-claws");
    expect(result.primary.system.description.value).toContain("<h5>Wastelander Mutations</h5>");
    expect(result.primary.system.description.value).not.toContain("<em><strong>Wastelander Mutations.</strong></em>");
    expect(result.primary.system.advancement.bfeLanguages0000.hint).toBe("You know Common and one additional language of your choice. Typical wastelander heritage characters choose Goblin.");
  });

  it("parses heritage/background/talent as valid Black Flag item types", () => {
    expect(parseInput("heritage", "Aerobat\nYou are at home in high places.\nDescender. You can slow your fall.").primary.type).toBe("heritage");
    expect(parseInput("background", "Vampire Hunter\nYou hunt creatures of the night.\nSkill Proficiencies: Choose two.\nEquipment: A stake.\nTalent: Choose one martial talent.").primary.type).toBe("background");
    const talent = parseInput("talent", "Alert\nMartial Talent\nPrerequisite: None\nBenefit. You gain a +5 bonus to initiative.").primary;
    expect(talent.type).toBe("talent");
    expect(talent.system.type.category).toBe("martial");
  });

  it("formats PDF-pasted backgrounds with advancement labels, sections, and motivation tables", () => {
    const result = parseInput("background", `VAMPIRE HUNTER
You trained and worked within a troupe of vampire hunters.
You learned how to detect the presence of a vampire in a
community, how to track it to its lair, and how to destroy
it utterly. And you learned that vampire hunters live short,
violent lives.
Skill Proficiencies: Choose two from History, Insight,
Investigation, or Sleight of Hand.
Additional Proficiencies: Learn one additional language
of your choice and gain proficiency with trapper tools.
Equipment: A cloak, a set of traveler’s clothes, a backpack,
five wooden stakes, a hand mirror, and a pouch containing
10 gp.
TALENT
You have received special training combined with some
natural ability to make you a crack vampire hunter. Choose
a talent from this list to represent your experience: Covert,
Critical Training, or Spell Duelist.
ADVENTURING MOTIVATION
Perhaps the adventuring life is an extension of your
previous line of work. Or maybe you were the only survivor
of a failed hunt and decided to move on to less fickle game.
Consider what made you stop hunting vampires and take
up a less focused life of adventuring.

ADVENTURING MOTIVATION
d8 Adventuring Motivation
1 Any dead monster is a good monster, vampire or no. Adventuring gets that done.
2 I honor my trainer by continuing this work in the course of adventuring.`);
    const item = result.primary;
    const html = item.system.description.value;
    expect(item.type).toBe("background");
    expect(item.name).toBe("Vampire Hunter");
    expect(item.img).toBe("systems/black-flag/artwork/types/background.svg");
    expect(item.system.description.short).toBe("You trained and worked within a troupe of vampire hunters. You learned how to detect the presence of a vampire in a community, how to track it to its lair, and how to destroy it utterly.");
    expect(html).toContain("<p>You trained and worked within a troupe of vampire hunters.</p>");
    expect(html).toContain("<p>You learned how to detect the presence of a vampire in a community, how to track it to its lair, and how to destroy it utterly.</p>");
    expect(html).toContain("<p>And you learned that vampire hunters live short, violent lives.</p>");
    expect(html).toContain("<p><em><strong>Skill Proficiencies:</strong></em> Choose two from History, Insight, Investigation, or Sleight of Hand.</p>");
    expect(html).toContain("<p><em><strong>Additional Proficiencies:</strong></em> Learn one additional language of your choice and gain proficiency with trapper tools.</p>");
    expect(html).toContain("<p><em><strong>Equipment:</strong></em> A cloak, a set of traveler’s clothes, a backpack, five wooden stakes, a hand mirror, and a pouch containing 10 gp.</p>");
    expect(html).toContain("<h4>Talent</h4>");
    expect(html).toContain("<p>You have received special training combined with some natural ability to make you a crack vampire hunter. Choose a talent from this list to represent your experience: Covert, Critical Training, or Spell Duelist.</p>");
    expect(html).toContain("<h4>Adventuring Motivation</h4>");
    expect(html).toContain("<table><thead><tr><th>d8</th><th>Adventuring Motivation</th></tr></thead><tbody>");
    expect(html).toContain("<td>1</td><td>Any dead monster is a good monster, vampire or no. Adventuring gets that done.</td>");
    expect(html).toContain("<td>2</td><td>I honor my trainer by continuing this work in the course of adventuring.</td>");
    expect(item.system.advancement.bfeSkillProfs000.type).toBe("trait");
    expect(item.system.advancement.bfeSkillProfs000.hint).toBe("Choose two from History, Insight, Investigation, or Sleight of Hand.");
    expect(item.system.advancement.bfeSkillProfs000.configuration.choices).toEqual([{ count: 2, pool: ["skills:history", "skills:insight", "skills:investigation", "skills:sleightOfHand"] }]);
    expect(item.system.advancement.bfeAdditional000.hint).toBe("Learn one additional language of your choice and gain proficiency with trapper tools.");
    expect(item.system.advancement.bfeAdditional000.configuration.choices).toEqual([{ count: 1, pool: ["languages:*"] }]);
    expect(item.system.advancement.bfeAdditional000.configuration.grants).toEqual(["tools:trapper"]);
    expect(item.system.advancement.bfeEquipment0000.type).toBe("equipment");
    expect(item.system.advancement.bfeEquipment0000.hint).toBe("A cloak, a set of traveler’s clothes, a backpack, five wooden stakes, a hand mirror, and a pouch containing 10 gp.");
    expect(item.system.advancement.bfeEquipment0000.level).toEqual({ value: 0, classRestriction: "original" });
    expect(item.flags["black-flag-enhancements"].equipment).toEqual([
      { name: "cloak", count: null },
      { name: "traveler’s clothes", count: null },
      { name: "backpack", count: null },
      { name: "wooden stakes", count: 5 },
      { name: "hand mirror", count: null },
      { name: "Gold", count: 10 }
    ]);
    expect(item.system.advancement.bfeTalent0000000.hint).toBe("You have received special training combined with some natural ability to make you a crack vampire hunter. Choose a talent from this list to represent your experience: Covert, Critical Training, or Spell Duelist.");
    expect(item.system.advancement.bfeTalent0000000._id).toBe("bfeTalent0000000");
    expect(item.system.advancement.bfeTalent0000000._id).toHaveLength(16);
    expect(item.system.advancement.bfeTalent0000000.configuration.choices).toEqual({ 0: { count: 1 } });
    expect(item.system.advancement.bfeTalent0000000.configuration.type).toBe("talent");
    expect(item.flags["black-flag-enhancements"].talentNames).toEqual(["Covert", "Critical Training", "Spell Duelist"]);
  });

  it("parses background equipment options and OR choices", () => {
    const item = parseInput("background", `SOLDIER
You spent a significant amount of time risking your life to defend others.
Equipment: A symbol of rank (like a letter, badge, or identification tags), a mess kit, a pack of playing cards or a set of dice, a set of common clothes, and a pouch containing 10 gp.`).primary;
    expect(item.flags["black-flag-enhancements"].equipment).toEqual([
      { name: "symbol of rank", count: null },
      { name: "mess kit", count: null },
      { group: "OR", options: [{ name: "playing cards", count: null }, { name: "dice", count: null }] },
      { name: "common clothes", count: null },
      { name: "Gold", count: 10 }
    ]);
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
