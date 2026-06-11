import { linesToHtml, makeDescription } from "./html.js";
import { parseBackground, parseHeritage, parseLineage, parseTalent, cleanPdfText } from "./concept-parsers.js";

export const PARSER_TYPES = {
  spell: { label: "Spell" },
  ammunition: { label: "Ammunition" },
  armor: { label: "Armor" },
  weapon: { label: "Weapon" },
  enchantment: { label: "Enchantment" },
  consumable: { label: "Consumable" },
  container: { label: "Container" },
  gear: { label: "Gear" },
  staff: { label: "Staff" },
  lineage: { label: "Lineage" },
  heritage: { label: "Heritage" },
  background: { label: "Background" },
  talent: { label: "Talent" }
};

function firstTitle(lines) { return lines.find(l => /^[A-Z][\w'’ -]{2,80}$/.test(l)) || "Untitled"; }
function descAfterTitle(lines, name) { const i=lines.indexOf(name); return lines.slice(i+1); }
function item(name, type, html, system={}) { return { name, type, img: "icons/svg/item-bag.svg", system: { description: makeDescription(html), ...system } }; }

export function parseSpell(input) {
  const lines = cleanPdfText(input); const name = firstTitle(lines); const body = descAfterTitle(lines, name);
  const level = body.find(l => /cantrip|\d+(?:st|nd|rd|th)-level/i.test(l)) || "";
  return { primary: item(name, "spell", linesToHtml(body), { level, activities: {} }) };
}

export function parseMagicItem(input, fallbackType = "gear") {
  const lines = cleanPdfText(input); const name = firstTitle(lines); const body = descAfterTitle(lines, name);
  const text = lines.join("\n");
  const type = /armor/i.test(text) ? "armor" : /weapon/i.test(text) ? "weapon" : fallbackType;
  return { primary: item(name, type, linesToHtml(body), { attunement: /requires attunement/i.test(text) ? "required" : "" }) };
}

export function parseEnchantment(input) { return parseMagicItem(input, "enchantment"); }
export function parseArmorWeapon(input) { return parseMagicItem(input, "gear"); }
export function findBaseData() { return {}; }
export function findType(type) { return PARSER_TYPES[type] ? type : "gear"; }

export function normalizeParseResult(result) {
  if (result?.primary) return result;
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
