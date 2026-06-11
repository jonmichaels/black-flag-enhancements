import { linesToHtml, makeDescription, escapeHTML } from "./html.js";
import { parseBackground, parseHeritage, parseLineage, parseTalent, cleanPdfText } from "./concept-parsers.js";
import { MODULE_ID } from "../constants.js";

export const PARSER_TYPES = {
  spell: { label: "BF.Item.Type.Spell[one]", fallbackLabel: "Spell", template: `modules/${MODULE_ID}/templates/parser/types/spell-output.hbs` },
  ammunition: { label: "BF.Item.Type.Ammunition[one]", fallbackLabel: "Ammunition", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  armor: { label: "BF.Item.Type.Armor[one]", fallbackLabel: "Armor", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  weapon: { label: "BF.Item.Type.Weapon[one]", fallbackLabel: "Weapon", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  enchantment: { label: "BF.EFFECT.Type.Enchantment[one]", fallbackLabel: "Enchantment", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  consumable: { label: "BF.Item.Type.Consumable[one]", fallbackLabel: "Consumable", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  container: { label: "BF.Item.Type.Container[one]", fallbackLabel: "Container", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  gear: { label: "BF.Item.Gear.Category.WondrousItem[one]", fallbackLabel: "Wondrous Item", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  staff: { label: "BF.Item.Gear.Category.Staff[one]", fallbackLabel: "Staff", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  lineage: { label: "BFE.Parser.Type.Lineage", fallbackLabel: "Lineage", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  heritage: { label: "BFE.Parser.Type.Heritage", fallbackLabel: "Heritage", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  background: { label: "BFE.Parser.Type.Background", fallbackLabel: "Background", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  talent: { label: "BFE.Parser.Type.Talent", fallbackLabel: "Talent", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/talent-output.hbs` }
};

function firstTitle(lines) { return lines.find(l => /^[A-Z][\w'’ -]{2,80}$/.test(l)) || "Untitled"; }
function descAfterTitle(lines, name) { const i = lines.indexOf(name); return lines.slice(i + 1); }
function item(name, type, html, system = {}) { return { name, type, img: "icons/svg/item-bag.svg", system: { description: makeDescription(html), ...system } }; }

export function parseSpell(input) {
  const lines = cleanPdfText(input); const name = firstTitle(lines); const body = descAfterTitle(lines, name);
  const level = body.find(l => /cantrip|\d+(?:st|nd|rd|th)-level/i.test(l)) || "";
  return { primary: item(name, "spell", linesToHtml(body), { level, activities: {} }) };
}

export function parseMagicItem(input, fallbackType = "gear") {
  const lines = cleanPdfText(input); const name = firstTitle(lines); const body = descAfterTitle(lines, name);
  const text = lines.join("\n");
  const type = /armor/i.test(text) ? "armor" : /weapon/i.test(text) ? "weapon" : fallbackType;
  return { primary: item(name, type, linesToHtml(body), { attunement: { value: /requires attunement/i.test(text) ? "required" : "none", requirement: "" }, rarity: "", price: { label: "—" }, type: { label: PARSER_TYPES[type]?.fallbackLabel ?? type } }) };
}

export function parseEnchantment(input) { return parseMagicItem(input, "enchantment"); }
export function parseArmorWeapon(input) { return parseMagicItem(input, "gear"); }
export function findBaseData() { return {}; }
export function findType(type) { return PARSER_TYPES[type] ? type : "gear"; }

export function normalizeParseResult(result) {
  if (result?.primary) return { related: [], ...result };
  return { primary: result, related: [] };
}

export function parseInput(type, input) {
  switch (type) {
    case "spell": return parseSpell(input);
    case "ammunition":
    case "armor":
    case "weapon":
    case "consumable":
    case "container":
    case "gear":
    case "staff": return parseMagicItem(input, type === "staff" ? "gear" : type);
    case "enchantment": return parseEnchantment(input);
    case "lineage": return parseLineage(input);
    case "heritage": return parseHeritage(input);
    case "background": return parseBackground(input);
    case "talent": return parseTalent(input);
    default: throw new Error(`Unsupported parser type: ${type}`);
  }
}
