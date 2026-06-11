import { linesToHtml, makeDescription, escapeHTML } from "./html.js";

const TRAIT_SKIP = new Set(["age", "size", "speed"]);

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

function baseItem(name, type, html, system = {}) {
  return { name, type, img: "icons/svg/book.svg", system: { description: makeDescription(html), ...system } };
}

function parseTraitStart(line) {
  const match = String(line || "").trim().match(/^([^.:]{2,80})\.\s*(.*)$/);
  if (!match) return null;
  const name = match[1].trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 4) return null;
  if (!/^\p{Lu}/u.test(name)) return null;
  if (/^(and|but|or|when|while|where|because|by|with|without|you|your|the|a|an)\b/i.test(name)) return null;
  return { name: toTitleCase(name), rest: match[2].trim() };
}

function splitTraits(lines) {
  const traits = [];
  let current = null;
  for (const line of lines) {
    const match = parseTraitStart(line);
    if (match) {
      if (current) traits.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { name: match.name, lines: [] };
      if (match.rest) current.lines.push(match.rest);
    } else if (current) current.lines.push(line);
  }
  if (current) traits.push({ ...current, text: normalizeInlineText(current.lines) });
  return traits;
}

function traitLine(trait) {
  return `${trait.name}. ${trait.text}`.trim();
}

export function parseLineage(input) {
  const lines = cleanPdfText(input);
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const marker = body.findIndex(l => isLineageMarker(l, name));
  if (marker < 0) return { primary: baseItem(name, "lineage", linesToHtml(descriptionSentences(body))), related: [] };
  const before = body.slice(0, marker);
  const traitLines = body.slice(marker + 1);
  const traits = splitTraits(traitLines);
  const related = [];
  const mainBlocks = [...descriptionSentences(before), "Lineage Traits"];
  for (const trait of traits) {
    const key = trait.name.toLowerCase();
    if (TRAIT_SKIP.has(key)) mainBlocks.push(traitLine(trait));
    else {
      const token = `@@BFE_EMBED:${trait.name}@@`;
      mainBlocks.push(`${trait.name}. ${token}`);
      related.push(baseItem(trait.name, "feature", linesToHtml([traitLine(trait)]), { source: name }));
    }
  }
  let html = linesToHtml(mainBlocks).replace(/<h5>Lineage Traits<\/h5>/, "<h5>Lineage Traits</h5>");
  html = html.replace(/<p><em><strong>([^<]+)\.<\/strong><\/em> @@BFE_EMBED:([^@]+)@@<\/p>/g, (_m, label, traitName) => `<p><em><strong>${escapeHTML(label)}.</strong></em> @@BFE_EMBED:${traitName}@@</p>`);
  return { primary: baseItem(name, "lineage", html), related };
}

export function parseHeritage(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  return { primary: baseItem(name, "heritage", linesToHtml(body)) };
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
