import { linesToHtml, makeDescription, escapeHTML } from "./html.js";
import { commonTraitEnhancement } from "./common-traits.js";

const LINEAGE_TRAIT_SKIP = new Set(["age", "size", "speed"]);
const HERITAGE_LANGUAGE_ADVANCEMENT_ID = "bfeLanguages0000";

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
  return new RegExp(`^(?:${escaped}\\s+)?lineage\\s+traits$`, "i").test(String(line || "").trim());
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

const LINEAGE_ICON = "systems/black-flag/artwork/types/lineage.svg";
const HERITAGE_ICON = "systems/black-flag/artwork/types/heritage.svg";
const FEATURE_ICON = "systems/black-flag/artwork/types/feature.svg";
const SIZE_ADVANCEMENT_ID = "bfeSize000000000";
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

function extractWastelanderMutations(name, lines = []) {
  if (slugify(name) !== "wastelander") return { traitLines: lines, mutationHtml: "" };
  const marker = lines.findIndex(line => /^wastelander mutations$/i.test(line));
  if (marker < 0) return { traitLines: lines, mutationHtml: "" };
  return {
    traitLines: lines.slice(0, marker),
    mutationHtml: mutationTableHtml(lines[marker], lines.slice(marker + 1))
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

function parseTraitSection({ name, type, before, traitLines, category, skippedTraits = new Set(), header = null, img = "icons/svg/book.svg", extraAdvancement = () => null, maxTraitWords = 4, extraTraitHtml = null }) {
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
    } else if (skippedTraits.has(key)) traitBlocks.push(traitHtml(trait));
    else {
      traitBlocks.push(traitHtml(trait));
      related.push(featureItem(trait, name, category));
    }
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
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const marker = body.findIndex(l => isLineageMarker(l, name));
  if (marker < 0) return { primary: baseItem(name, "lineage", linesToHtml(descriptionSentences(body)), { identifier: { value: slugify(name) } }, LINEAGE_ICON), related: [] };
  return parseTraitSection({
    name,
    type: "lineage",
    before: body.slice(0, marker),
    traitLines: body.slice(marker + 1),
    category: "lineage",
    skippedTraits: LINEAGE_TRAIT_SKIP,
    header: `${name} Lineage Traits`,
    img: LINEAGE_ICON
  });
}

export function parseHeritage(input) {
  const lines = cleanPdfText(input);
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const traitStart = findHeritageTraitStart(body);
  if (traitStart < 0) return { primary: baseItem(name, "heritage", linesToHtml(descriptionSentences(body)), { identifier: { value: slugify(name) } }, HERITAGE_ICON), related: [] };
  const { traitLines, mutationHtml } = extractWastelanderMutations(name, body.slice(traitStart));
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
    extraTraitHtml: { traitName: "Beneficial Mutation", html: mutationHtml }
  });
}

export function parseBackground(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const html = linesToHtml(body, { traitStyle: false })
    .replace(/<p>(Skill Proficiencies:[^<]+)<\/p>/gi, "<h5>Skill Proficiencies</h5><p>$1</p>")
    .replace(/<p>(Equipment:[^<]+)<\/p>/gi, "<h5>Equipment</h5><p>$1</p>")
    .replace(/<p>(Talent:[^<]+)<\/p>/gi, "<h5>Talent</h5><p>$1</p>");
  return { primary: baseItem(name, "background", html) };
}

export function parseTalent(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const categoryLine = body.find(l => /talent/i.test(l)) || "Talent";
  const category = /martial/i.test(categoryLine) ? "martial" : /magic/i.test(categoryLine) ? "magic" : "general";
  return { primary: baseItem(name, "talent", linesToHtml(body), { type: { category } }) };
}
