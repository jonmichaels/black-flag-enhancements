import { linesToHtml, makeDescription, escapeHTML } from "./html.js";
import { commonTraitEnhancement } from "./common-traits.js";

const LINEAGE_TRAIT_SKIP = new Set(["age", "size", "speed"]);
const HERITAGE_LANGUAGE_ADVANCEMENT_ID = "bfeLanguages0000";
const DEFAULT_HERITAGE_LANGUAGE_TEXT = "You know Common and one additional language of your choice.";

function toTitleCase(value = "") {
  return String(value).trim().toLowerCase().replace(/\b[\p{L}\p{N}'’]+/gu, word => word.charAt(0).toUpperCase() + word.slice(1));
}

function normalizeInlineText(lines = []) {
  return lines.map(l => String(l || "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function descriptionSentences(lines = []) {
  const text = normalizeInlineText(lines);
  if (!text) return [];
  return text.match(/[^.!?]+[.!?]+(?:["”’])?|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [text];
}

function isLineageMarker(line, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(?:${escaped}s?\\s+)?lineage\\s+traits$`, "i").test(String(line || "").trim());
}

export function cleanPdfText(input = "") {
  const raw = String(input).replace(/\r\n?/g, "\n").replace(/[\u00a0\t]/g, " ");
  const lines = raw.split("\n")
    .map(l => l.replace(/\s+/g, " ").trim())
    .filter(l => l && !/^\d+$/.test(l) && !/^black flag roleplaying/i.test(l) && !/^tales of the valiant/i.test(l));
  const joined = [];
  for (const line of lines) {
    const prev = joined[joined.length - 1];
    if (prev && /-$/.test(prev) && /^[a-z]/.test(line)) joined[joined.length - 1] = prev.slice(0, -1) + line;
    else joined.push(line);
  }
  return joined;
}

function titleFrom(lines) {
  const idx = lines.findIndex(l => /^[A-Z][\w'’ -]{2,80}$/.test(l) && !/^(Lineage Traits|Martial Talent|Magic Item|Spell)$/i.test(l));
  return { name: idx >= 0 ? lines[idx] : (lines[0] || "Untitled"), body: lines.slice(idx + 1) };
}

const SINGULAR_LINEAGE_NAMES = new Map([
  ["centaurs", "Centaur"]
]);

function normalizeLineageName(name = "") {
  const title = toTitleCase(name);
  return SINGULAR_LINEAGE_NAMES.get(title.toLowerCase()) ?? title;
}

const LINEAGE_ICON = "systems/black-flag/artwork/types/lineage.svg";
const HERITAGE_ICON = "systems/black-flag/artwork/types/heritage.svg";
const BACKGROUND_ICON = "systems/black-flag/artwork/types/background.svg";
const FEATURE_ICON = "systems/black-flag/artwork/types/feature.svg";
const SIZE_ADVANCEMENT_ID = "bfeSize000000000";
const SPEED_ADVANCEMENT_ID = "bfeSpeed00000000";
const CLIMB_SPEED_ADVANCEMENT_ID = "bfeClimb00000000";
const FEATURES_ADVANCEMENT_ID = "bfeFeatures00000";

function baseItem(name, type, html, system = {}, img = "icons/svg/book.svg") {
  return { name, type, img, system: { description: makeDescription(html), ...system } };
}

function parseTraitStart(line, { maxWords = 4 } = {}) {
  const match = String(line || "").trim().match(/^([^.:]{2,80})\.\s*(.*)$/);
  if (!match) return null;
  const name = match[1].trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > maxWords) return null;
  if (!/^\p{Lu}/u.test(name)) return null;
  if (/^(and|but|or|when|while|where|because|by|with|without|you|your|the|a|an)\b/i.test(name)) return null;
  return { name: toTitleCase(name), rest: match[2].trim() };
}

function endsSentence(line = "") {
  return /[.!?]["”’)]?$/.test(String(line || "").trim());
}

function splitTraits(lines, { maxWords = 4 } = {}) {
  const traits = [];
  let current = null;
  let previousLine = "";
  for (const line of lines) {
    if (/^Gearforged Components$/i.test(line)) {
      if (current) {
        traits.push({ ...current, text: normalizeInlineText(current.lines) });
        current = null;
      }
      previousLine = ".";
      continue;
    }
    const match = parseTraitStart(line, { maxWords });
    if (match && (!current || endsSentence(previousLine))) {
      if (current) traits.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { name: match.name, lines: [] };
      if (match.rest) current.lines.push(match.rest);
    } else if (current) current.lines.push(line);
    previousLine = line;
  }
  if (current) traits.push({ ...current, text: normalizeInlineText(current.lines) });
  return traits;
}

function traitLine(trait) {
  return `${trait.name}. ${trait.text}`.trim();
}

function slugify(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function featureItem(trait, parentName, category = "lineage") {
  const enhancement = commonTraitEnhancement(trait);
  const html = [linesToHtml([trait.text], { traitStyle: false }), trait.html].filter(Boolean).join("\n");
  return baseItem(trait.name, "feature", html, {
    identifier: { associated: slugify(parentName), value: slugify(trait.name) },
    type: { category, value: "" },
    source: parentName,
    ...(enhancement.system ?? {})
  }, enhancement.img ?? FEATURE_ICON);
}

function parseSizeOptions(text = "") {
  const normalized = String(text).toLowerCase();
  const options = [];
  if (/\bsmall\b/.test(normalized)) options.push("small");
  if (/\bmedium\b/.test(normalized)) options.push("medium");
  if (/\blarge\b/.test(normalized)) options.push("large");
  return options.length ? options : [];
}

function sizeAdvancement(trait) {
  const options = parseSizeOptions(trait?.text ?? "");
  if (!options.length) return null;
  return {
    _id: SIZE_ADVANCEMENT_ID,
    configuration: { options },
    flags: {},
    hint: traitLine(trait),
    icon: null,
    level: { value: null },
    title: "",
    type: "size"
  };
}

function parseSpeedValue(text = "") {
  const match = String(text).match(/\b(\d+)\s*(?:feet|foot|ft\.?)\b/i);
  const speed = match ? Number(match[1]) : null;
  return Number.isFinite(speed) ? speed : null;
}

function parseMovementTypeSpeedValue(text = "", type = "") {
  const match = String(text).match(new RegExp(`\\b(\\d+)\\s*[- ]?(?:feet|foot|ft\\.?)\\s+${type}(?:ing)?\\s+speed\\b`, "i"));
  const speed = match ? Number(match[1]) : null;
  return Number.isFinite(speed) ? speed : null;
}

function speedAdvancement(trait) {
  const speed = parseSpeedValue(trait?.text ?? "");
  if (!speed || speed === 30) return null;
  return {
    _id: SPEED_ADVANCEMENT_ID,
    configuration: { changes: [{ key: "system.traits.movement.base", mode: 5, value: String(speed) }] },
    flags: {},
    hint: traitLine(trait),
    icon: null,
    level: { value: 0, classIdentifier: "" },
    title: "Speed",
    type: "property"
  };
}

function climbSpeedAdvancement(trait) {
  const speed = parseMovementTypeSpeedValue(trait?.text ?? "", "climb");
  if (!speed) return null;
  return {
    _id: CLIMB_SPEED_ADVANCEMENT_ID,
    configuration: { changes: [{ key: "system.traits.movement.types.climb", mode: 5, value: String(speed) }] },
    flags: {},
    hint: traitLine(trait),
    icon: null,
    level: { value: 0, classIdentifier: "" },
    title: "Climbing Speed",
    type: "property"
  };
}

function languageAdvancement(trait) {
  if (!trait || !/^languages$/i.test(trait.name)) return null;
  return {
    _id: HERITAGE_LANGUAGE_ADVANCEMENT_ID,
    configuration: {
      choices: [],
      grants: ["languages:standard:common"],
      mode: "default",
      choiceMode: "inclusive"
    },
    flags: {},
    hint: trait.text,
    icon: null,
    level: { value: 0 },
    title: "Languages",
    type: "trait"
  };
}

function parseMutationRows(lines = []) {
  const rows = [];
  let current = null;
  for (const line of lines) {
    if (/^d6\s+mutation$/i.test(line)) continue;
    const numbered = String(line).match(/^(\d+)\s+(.+)$/);
    const numberOnly = String(line).match(/^(\d+)$/);
    if (numbered) {
      if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { roll: numbered[1], lines: [numbered[2]] };
    } else if (numberOnly) {
      if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { roll: numberOnly[1], lines: [] };
    } else if (current && parseTraitStart(line, { maxWords: 3 }) && normalizeInlineText(current.lines)) {
      rows.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { roll: String(Number(current.roll) + 1), lines: [line] };
    } else if (current) current.lines.push(line);
  }
  if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
  return rows.filter(row => row.roll && row.text);
}

function mutationTableHtml(title, lines = []) {
  const rows = parseMutationRows(lines);
  if (!rows.length) return "";
  const body = rows.map(row => `<tr><td>${escapeHTML(row.roll)}</td><td>${escapeHTML(row.text)}</td></tr>`).join("\n");
  return `<h5>${escapeHTML(toTitleCase(title))}</h5>\n<table><thead><tr><th>d6</th><th>Mutation</th></tr></thead><tbody>\n${body}\n</tbody></table>`;
}

function mutationRowTraits(lines = []) {
  return parseMutationRows(lines).map(row => {
    const match = parseTraitStart(row.text, { maxWords: 3 });
    return match ? { name: match.name, text: match.rest, lines: [match.rest] } : { name: `Mutation ${row.roll}`, text: row.text, lines: [row.text] };
  });
}

function extractWastelanderMutations(name, lines = []) {
  if (slugify(name) !== "wastelander") return { traitLines: lines, mutationHtml: "", mutationTraits: [] };
  const marker = lines.findIndex(line => /^wastelander mutations$/i.test(line));
  if (marker < 0) return { traitLines: lines, mutationHtml: "", mutationTraits: [] };
  const mutationLines = lines.slice(marker + 1);
  return {
    traitLines: lines.slice(0, marker),
    mutationHtml: mutationTableHtml(lines[marker], mutationLines),
    mutationTraits: mutationRowTraits(mutationLines)
  };
}


function draconicAncestryTableHtml(lines = []) {
  const damageTypes = "Acid|Lightning|Fire|Poison|Cold|Necrotic|Radiant";
  const rows = lines.map(line => String(line).match(new RegExp(`^(.+?)\\s+(${damageTypes})$`, "i")))
    .filter(Boolean)
    .map(match => ({ dragon: normalizeInlineText([match[1]]), damage: toTitleCase(match[2]) }));
  if (!rows.length) return "";
  const body = rows.map(row => `<tr><td>${escapeHTML(row.dragon)}</td><td>${escapeHTML(row.damage)}</td></tr>`).join("\n");
  return `<h5>Draconic Ancestry</h5>\n<table><thead><tr><th>Dragon Type</th><th>Damage Type</th></tr></thead><tbody>\n${body}\n</tbody></table>`;
}

function extractDraconicAncestryTable(lines = []) {
  const titleIndex = lines.findIndex((line, index) => /^draconic ancestry$/i.test(line) && /^dragon type\s+damage type$/i.test(lines[index + 1] ?? ""));
  if (titleIndex < 0) return { traitLines: lines, tableHtml: "" };
  let end = titleIndex + 2;
  while (end < lines.length && !parseTraitStart(lines[end], { maxWords: 4 })) end += 1;
  const tableHtml = draconicAncestryTableHtml(lines.slice(titleIndex + 2, end));
  if (!tableHtml) return { traitLines: lines, tableHtml: "" };
  return {
    traitLines: [...lines.slice(0, titleIndex), ...lines.slice(end)],
    tableHtml
  };
}

function attachTraitHtml(traits, traitName, html) {
  if (!html) return;
  const trait = traits.find(t => t.name.toLowerCase() === traitName.toLowerCase());
  if (trait) trait.html = [trait.html, html].filter(Boolean).join("\n");
}

function traitHtml(trait) {
  return [linesToHtml([traitLine(trait)]), trait.html].filter(Boolean).join("\n");
}

function parseChoiceListTrait(trait) {
  const traitKey = trait?.name.toLowerCase();
  if (!trait || !["natural adaptation", "upgrade"].includes(traitKey)) return null;
  const choices = [];
  const introLines = [];
  let current = null;
  for (const rawLine of trait.lines ?? []) {
    const line = String(rawLine || "").trim();
    const match = line.match(/^[•\-*]\s*(Ogre|Troll|Fey|Earthborn|Fireborn|Waterborn|Windborn|Always Armed|Bulk Up|Quick Fix)\.\s*(.*)$/i);
    if (match) {
      if (current) choices.push({ ...current, text: normalizeInlineText(current.lines) });
      const label = toTitleCase(match[1]);
      const name = /^(Ogre|Troll|Fey)$/i.test(match[1]) ? `${label} Ancestor` : label;
      current = { name, label, lines: [] };
      if (match[2]) current.lines.push(match[2]);
    } else if (current) current.lines.push(line);
    else introLines.push(line);
  }
  if (current) choices.push({ ...current, text: normalizeInlineText(current.lines) });
  if (!choices.length) return null;
  const intro = normalizeInlineText(introLines);
  const list = choices.map(choice => `<li><strong>${escapeHTML(choice.label)}.</strong> ${escapeHTML(choice.text)}</li>`).join("\n");
  const html = `${linesToHtml([`${trait.name}. ${intro}`])}\n<ul>\n${list}\n</ul>`;
  const relatedTraits = choices.map(choice => ({ name: choice.name, text: choice.text, lines: [choice.text] }));
  return { html, relatedTraits };
}

function parseTraitSection({ name, type, before, traitLines, category, skippedTraits = new Set(), header = null, img = "icons/svg/book.svg", extraAdvancement = () => null, maxTraitWords = 4, extraTraitHtml = null, extraRelatedTraits = [], fallbackTraits = [] }) {
  const traits = splitTraits(traitLines, { maxWords: maxTraitWords });
  if (extraTraitHtml) attachTraitHtml(traits, extraTraitHtml.traitName, extraTraitHtml.html);
  const related = [];
  const traitBlocks = [];
  const advancement = {};
  for (const trait of traits) {
    const key = trait.name.toLowerCase();
    const extra = extraAdvancement(trait);
    if (extra) advancement[extra._id] = extra;
    if (key === "size") {
      const size = sizeAdvancement(trait);
      if (size) advancement[SIZE_ADVANCEMENT_ID] = size;
      traitBlocks.push(traitHtml(trait));
    } else if (key === "speed") {
      const speed = speedAdvancement(trait);
      if (speed) advancement[SPEED_ADVANCEMENT_ID] = speed;
      const climb = climbSpeedAdvancement(trait);
      if (climb) advancement[CLIMB_SPEED_ADVANCEMENT_ID] = climb;
      traitBlocks.push(traitHtml(trait));
    } else if (skippedTraits.has(key)) traitBlocks.push(traitHtml(trait));
    else {
      const choiceList = parseChoiceListTrait(trait);
      if (choiceList) {
        traitBlocks.push(choiceList.html);
        for (const choice of choiceList.relatedTraits) related.push(featureItem(choice, name, category));
      } else {
        traitBlocks.push(traitHtml(trait));
        related.push(featureItem(trait, name, category));
      }
    }
  }
  for (const trait of fallbackTraits) {
    const key = trait.name.toLowerCase();
    if (traits.some(existing => existing.name.toLowerCase() === key)) continue;
    const extra = extraAdvancement(trait);
    if (extra && !advancement[extra._id]) advancement[extra._id] = extra;
    traitBlocks.push(traitHtml(trait));
    if (!skippedTraits.has(key)) related.push(featureItem(trait, name, category));
  }
  for (const trait of extraRelatedTraits) {
    related.push(featureItem(trait, name, category));
  }
  const htmlParts = [linesToHtml(descriptionSentences(before))];
  if (header) htmlParts.push(`<h4>${escapeHTML(header)}</h4>`);
  htmlParts.push(traitBlocks.join("\n"));
  const html = htmlParts.filter(Boolean).join("\n");
  return { primary: baseItem(name, type, html, { advancement, identifier: { value: slugify(name) } }, img), related };
}

function findHeritageTraitStart(lines = []) {
  for (let i = 0; i < lines.length; i += 1) {
    const match = parseTraitStart(lines[i], { maxWords: 3 });
    const previous = lines[i - 1] ?? "";
    if (match && i > 0 && endsSentence(previous)) return i;
  }
  return -1;
}

export function parseLineage(input) {
  const lines = cleanPdfText(input);
  const name = normalizeLineageName(lines[0] || "Untitled");
  const body = lines.slice(1);
  const marker = body.findIndex(l => isLineageMarker(l, name));
  if (marker < 0) return { primary: baseItem(name, "lineage", linesToHtml(descriptionSentences(body)), { identifier: { value: slugify(name) } }, LINEAGE_ICON), related: [] };
  const { traitLines, tableHtml } = extractDraconicAncestryTable(body.slice(marker + 1));
  return parseTraitSection({
    name,
    type: "lineage",
    before: body.slice(0, marker),
    traitLines,
    category: "lineage",
    skippedTraits: LINEAGE_TRAIT_SKIP,
    header: `${name} Lineage Traits`,
    img: LINEAGE_ICON,
    extraTraitHtml: { traitName: "Draconic Ancestry", html: tableHtml }
  });
}

export function parseHeritage(input) {
  const lines = cleanPdfText(input);
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const traitStart = findHeritageTraitStart(body);
  if (traitStart < 0) return { primary: baseItem(name, "heritage", linesToHtml(descriptionSentences(body)), { identifier: { value: slugify(name) } }, HERITAGE_ICON), related: [] };
  const { traitLines, mutationHtml, mutationTraits } = extractWastelanderMutations(name, body.slice(traitStart));
  return parseTraitSection({
    name,
    type: "heritage",
    before: body.slice(0, traitStart),
    traitLines,
    category: "heritage",
    skippedTraits: new Set(["languages"]),
    extraAdvancement: languageAdvancement,
    maxTraitWords: 3,
    img: HERITAGE_ICON,
    extraTraitHtml: { traitName: "Beneficial Mutation", html: mutationHtml },
    extraRelatedTraits: mutationTraits,
    fallbackTraits: [{ name: "Languages", text: DEFAULT_HERITAGE_LANGUAGE_TEXT, lines: [DEFAULT_HERITAGE_LANGUAGE_TEXT] }]
  });
}

const BACKGROUND_INLINE_ADVANCEMENTS = ["Skill Proficiencies", "Additional Proficiencies", "Equipment"];
const BACKGROUND_SECTION_HEADINGS = ["Talent", "Adventuring Motivation"];
const BACKGROUND_ADVANCEMENT_IDS = {
  skills: "bfeSkillProfs000",
  additional: "bfeAdditional000",
  equipment: "bfeEquipment0000",
  talent: "bfeTalent0000000"
};
const SKILL_NAME_KEYS = {
  acrobatics: "acrobatics",
  "animal handling": "animalHandling",
  arcana: "arcana",
  athletics: "athletics",
  deception: "deception",
  history: "history",
  insight: "insight",
  intimidation: "intimidation",
  investigation: "investigation",
  medicine: "medicine",
  nature: "nature",
  perception: "perception",
  performance: "performance",
  persuasion: "persuasion",
  religion: "religion",
  "sleight of hand": "sleightOfHand",
  stealth: "stealth",
  survival: "survival"
};
const NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const TOOL_NAME_KEYS = {
  "trapper tools": "trapper",
  "thieves' tools": "thieves",
  "thieves tools": "thieves",
  "alchemist's tools": "alchemist",
  "alchemists tools": "alchemist",
  "artist tools": "artist",
  "charlatan tools": "charlatan",
  "clothier tools": "clothier",
  "construction tools": "construction",
  "smithing tools": "smithing",
  "herbalist tools": "herbalist",
  "navigator tools": "navigator",
  "provisioner tools": "provisioner",
  "tinker tools": "tinker"
};

function backgroundInlineAdvancement(line = "") {
  for (const label of BACKGROUND_INLINE_ADVANCEMENTS) {
    const match = String(line).match(new RegExp(`^${label}\\s*([:.])\\s*(.*)$`, "i"));
    if (match) return { label, punctuation: match[1], rest: match[2].trim() };
  }
  return null;
}

function backgroundSectionHeading(line = "") {
  const normalized = toTitleCase(line);
  return BACKGROUND_SECTION_HEADINGS.includes(normalized) ? normalized : null;
}

function backgroundTableRows(lines = []) {
  const rows = [];
  let current = null;
  for (const line of lines) {
    const numbered = String(line).match(/^(\d+)\s+(.+)$/);
    const numberOnly = String(line).match(/^(\d+)$/);
    if (numbered) {
      if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { roll: numbered[1], lines: [numbered[2]] };
    } else if (numberOnly) {
      if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { roll: numberOnly[1], lines: [] };
    } else if (current) current.lines.push(line);
  }
  if (current) rows.push({ ...current, text: normalizeInlineText(current.lines) });
  return rows.filter(row => row.roll && row.text);
}

function backgroundTableHtml(headerLine, lines = []) {
  const match = String(headerLine || "").match(/^(d\d+)\s+(.+)$/i);
  if (!match) return "";
  const rows = backgroundTableRows(lines);
  if (!rows.length) return "";
  const body = rows.map(row => `<tr><td>${escapeHTML(row.roll)}</td><td>${escapeHTML(row.text)}</td></tr>`).join("\n");
  return `<table><thead><tr><th>${escapeHTML(match[1])}</th><th>${escapeHTML(toTitleCase(match[2]))}</th></tr></thead><tbody>\n${body}\n</tbody></table>`;
}

function flushBackgroundSection(section, htmlParts) {
  if (!section) return;
  const text = normalizeInlineText(section.lines);
  if (text) htmlParts.push(`<p>${escapeHTML(text)}</p>`);
}

function numberFromText(text = "", fallback = 1) {
  const match = String(text).toLowerCase().match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!match) return fallback;
  return NUMBER_WORDS[match[1]] ?? Number(match[1]) ?? fallback;
}

function skillKeysFromText(text = "") {
  const normalized = String(text).toLowerCase().replace(/\bor\b/g, ",").replace(/\band\b/g, ",");
  const keys = [];
  for (const [label, key] of Object.entries(SKILL_NAME_KEYS)) {
    if (new RegExp(`\\b${label.replace(/ /g, "\\s+")}\\b`, "i").test(normalized)) keys.push(key);
  }
  return keys;
}

function talentNamesFromText(text = "") {
  const source = String(text);
  const match = source.match(/choose\s+a\s+talent[^:]*:\s*([^.]*)/i) ?? source.match(/:\s*([^:.]+?)\.?$/);
  if (!match) return [];
  return match[1].split(/,|\bor\b|\band\b/i).map(part => toTitleCase(part)).filter(Boolean);
}

function toolChoicePoolsFromText(text = "") {
  const choices = [];
  if (/\bone\s+(?:type\s+of\s+)?tool\s+or\s+gaming\s+set\s+of\s+your\s+choice\b/i.test(text)) choices.push({ count: 1, pool: ["tools:*", "tools:gaming:*"] });
  if (/\bone\s+(?:other\s+)?tool\s+or\s+instrument\s+of\s+your\s+choice\b/i.test(text)) choices.push({ count: 1, pool: ["tools:*", "tools:musicalInstrument:*"] });
  if (/\bartist\s+tools\s+or\s+a\s+musical\s+instrument\b/i.test(text)) choices.push({ count: 1, pool: ["tools:artist", "tools:musicalInstrument:*"] });
  return choices;
}

function toolGrantKeysFromText(text = "", choicePools = []) {
  const normalized = String(text).toLowerCase();
  const choiceKeys = new Set(choicePools.flatMap(choice => choice.pool).filter(key => !key.endsWith(":*")));
  const grants = [];
  for (const [label, key] of Object.entries(TOOL_NAME_KEYS)) {
    const grantKey = `tools:${key}`;
    if (choiceKeys.has(grantKey)) continue;
    if (new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i").test(normalized)) grants.push(grantKey);
  }
  return [...new Set(grants)];
}

function normalizeEquipmentName(text = "") {
  return String(text)
    .trim()
    .replace(/[.。]$/u, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/^a\s+set\s+of\s+/i, "")
    .replace(/^a\s+pack\s+of\s+/i, "")
    .replace(/^set\s+of\s+/i, "")
    .replace(/^pack\s+of\s+/i, "")
    .replace(/^(?:a|an|the|one)\s+/i, "")
    .replace(/^five\s+/i, "")
    .replace(/^\d+\s+/i, "")
    .trim();
}

function countFromEquipmentPart(text = "") {
  const match = String(text).trim().toLowerCase().match(/^(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
  if (!match) return null;
  return NUMBER_WORDS[match[1]] ?? Number(match[1]) ?? null;
}

function equipmentEntry(name, count = null) {
  return { name: normalizeEquipmentName(name), count };
}

function equipmentEntriesFromText(text = "") {
  const entries = [];
  const normalized = String(text).replace(/\s+/g, " ").trim();
  const currency = normalized.match(/\b(\d+)\s*(?:gp|gold(?:\s+pieces?)?)\b/i);
  const withoutCurrency = normalized
    .replace(/(?:,?\s*(?:and\s+)?)?a\s+pouch\s+containing\s+\d+\s*(?:gp|gold(?:\s+pieces?)?)/i, "")
    .replace(/(?:,?\s*(?:and\s+)?)?\d+\s*(?:gp|gold(?:\s+pieces?)?)/i, "");
  for (const rawPart of withoutCurrency.split(/,(?![^()]*\))/)) {
    const part = rawPart.trim().replace(/^and\s+/i, "");
    const partWithoutParentheticals = part.replace(/\s*\([^)]*\)\s*/g, " ");
    if (!part) continue;
    if (/\bor\b/i.test(partWithoutParentheticals)) {
      const options = partWithoutParentheticals.split(/\bor\b/i).map(option => equipmentEntry(option, countFromEquipmentPart(option))).filter(e => e.name);
      if (options.length) entries.push({ group: "OR", options });
    } else {
      const entry = equipmentEntry(part, countFromEquipmentPart(part));
      if (entry.name) entries.push(entry);
    }
  }
  if (currency) entries.push({ name: "Gold", count: Number(currency[1]) });
  return entries;
}

function backgroundEquipmentAdvancement(text = "") {
  return {
    _id: BACKGROUND_ADVANCEMENT_IDS.equipment,
    configuration: { pool: [] },
    flags: {},
    hint: text,
    icon: null,
    level: { value: 0, classRestriction: "original" },
    title: "",
    type: "equipment"
  };
}

function backgroundSkillAdvancement(text = "") {
  const skills = skillKeysFromText(text);
  return {
    _id: BACKGROUND_ADVANCEMENT_IDS.skills,
    configuration: { choiceMode: "inclusive", choices: [{ count: numberFromText(text, 2), pool: skills.map(skill => `skills:${skill}`) }], grants: [], mode: "default" },
    flags: {},
    hint: text,
    icon: null,
    level: { value: 0 },
    title: "Skill Proficiencies",
    type: "trait"
  };
}

function backgroundAdditionalAdvancement(text = "") {
  const choices = [];
  if (/\badditional language\b|\blanguage of your choice\b/i.test(text)) choices.push({ count: numberFromText(text, 1), pool: ["languages:*"] });
  choices.push(...toolChoicePoolsFromText(text));
  return {
    _id: BACKGROUND_ADVANCEMENT_IDS.additional,
    configuration: { choiceMode: "inclusive", choices, grants: toolGrantKeysFromText(text, choices), mode: "default" },
    flags: {},
    hint: text,
    icon: null,
    level: { value: 0 },
    title: "Additional Proficiencies",
    type: "trait"
  };
}

function backgroundTalentAdvancement(text = "") {
  return {
    _id: BACKGROUND_ADVANCEMENT_IDS.talent,
    configuration: { allowDrops: false, choices: { 0: { count: 1 } }, pool: [], restriction: {}, type: "talent" },
    flags: {},
    hint: text,
    icon: null,
    level: { value: 0 },
    title: "Talent",
    type: "chooseFeatures"
  };
}

export function parseBackground(input) {
  const lines = cleanPdfText(input);
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const htmlParts = [];
  const advancement = {};
  let intro = [];
  let inline = null;
  let section = null;
  let descriptionShort = "";
  let talentNames = [];
  let equipment = [];
  let i = 0;

  const flushIntro = () => {
    if (!intro.length) return;
    const sentences = descriptionSentences(intro);
    if (!descriptionShort) {
      descriptionShort = normalizeInlineText(sentences.slice(0, 2));
    }
    htmlParts.push(linesToHtml(sentences, { traitStyle: false }));
    intro = [];
  };
  const flushInline = () => {
    if (!inline) return;
    const text = normalizeInlineText(inline.lines);
    if (inline.label === "Skill Proficiencies") advancement[BACKGROUND_ADVANCEMENT_IDS.skills] = backgroundSkillAdvancement(text);
    else if (inline.label === "Additional Proficiencies") advancement[BACKGROUND_ADVANCEMENT_IDS.additional] = backgroundAdditionalAdvancement(text);
    else if (inline.label === "Equipment") {
      advancement[BACKGROUND_ADVANCEMENT_IDS.equipment] = backgroundEquipmentAdvancement(text);
      equipment = equipmentEntriesFromText(text);
    }
    const label = `${inline.label}${inline.punctuation}`;
    htmlParts.push(`<p><em><strong>${escapeHTML(label)}</strong></em>${text ? ` ${escapeHTML(text)}` : ""}</p>`);
    inline = null;
  };
  const flushSection = () => {
    if (section?.heading === "Talent") {
      const text = normalizeInlineText(section.lines);
      advancement[BACKGROUND_ADVANCEMENT_IDS.talent] = backgroundTalentAdvancement(text);
      talentNames = talentNamesFromText(text);
    }
    flushBackgroundSection(section, htmlParts);
    section = null;
  };

  while (i < body.length) {
    const line = body[i];
    const tableHeader = String(line).match(/^d\d+\s+adventuring motivation$/i);
    if (tableHeader) {
      flushIntro();
      flushInline();
      flushSection();
      const tableHtml = backgroundTableHtml(line, body.slice(i + 1));
      if (tableHtml) htmlParts.push(tableHtml);
      break;
    }

    const heading = backgroundSectionHeading(line);
    const nextIsTable = heading === "Adventuring Motivation" && /^d\d+\s+adventuring motivation$/i.test(body[i + 1] || "");
    if (heading && !nextIsTable) {
      flushIntro();
      flushInline();
      flushSection();
      htmlParts.push(`<h4>${escapeHTML(heading)}</h4>`);
      section = { heading, lines: [] };
      i += 1;
      continue;
    }
    if (heading && nextIsTable) {
      i += 1;
      continue;
    }

    const advancement = backgroundInlineAdvancement(line);
    if (advancement) {
      flushIntro();
      flushInline();
      flushSection();
      inline = { ...advancement, lines: advancement.rest ? [advancement.rest] : [] };
    } else if (inline) inline.lines.push(line);
    else if (section) section.lines.push(line);
    else intro.push(line);
    i += 1;
  }

  flushIntro();
  flushInline();
  flushSection();
  const html = htmlParts.filter(Boolean).join("\n");
  const primary = baseItem(name, "background", html, { advancement, identifier: { value: slugify(name) } }, BACKGROUND_ICON);
  primary.system.description.short = descriptionShort;
  primary.flags = { "black-flag-enhancements": { talentNames, equipment } };
  return { primary, related: [] };
}

export function parseTalent(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const categoryLine = body.find(l => /talent/i.test(l)) || "Talent";
  const category = /martial/i.test(categoryLine) ? "martial" : /magic/i.test(categoryLine) ? "magic" : "general";
  return { primary: baseItem(name, "talent", linesToHtml(body), { type: { category } }) };
}
