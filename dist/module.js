// ─── Black Flag Enhancements ───

// src/constants.js
var MODULE_ID = "black-flag-enhancements";
var SETTINGS = {
  PAUSE_OVERLAY_ENABLED: "pause-overlay-enabled",
  PAUSE_OVERLAY_IMAGE: "pause-overlay-image",
  PARSER_ENABLED: "parser-enabled",
  SUPPRESS_BLACK_FLAG_TOOLS_PARSER: "suppress-black-flag-tools-parser"
};
var TOV_MODULE_ID = "kp-tov-players-guide";
var BFT_MODULE_ID = "black-flag-tools";

// src/settings.js
function registerSettings() {
  const tovInstalled = game.modules.get(TOV_MODULE_ID)?.active ?? false;
  game.settings.register(MODULE_ID, SETTINGS.PAUSE_OVERLAY_ENABLED, {
    name: "Game Paused Overlay",
    hint: "Replace the default Foundry paused overlay with a Black Flag / ToV themed version.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
  game.settings.register(MODULE_ID, SETTINGS.PAUSE_OVERLAY_IMAGE, {
    name: "Paused Overlay Image",
    hint: "Choose which image to display on the paused overlay.",
    scope: "world",
    config: tovInstalled,
    type: String,
    choices: {
      "black-flag": "Black Flag Icon",
      ...tovInstalled ? { "tov-mark": "Tales of the Valiant Mark" } : {}
    },
    default: "black-flag",
    requiresReload: false
  });
  game.settings.register(MODULE_ID, SETTINGS.PARSER_ENABLED, {
    name: "Enable Content Parser",
    hint: "Show the Black Flag Enhancements parser button on unlocked Item compendiums.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
  game.settings.register(MODULE_ID, SETTINGS.SUPPRESS_BLACK_FLAG_TOOLS_PARSER, {
    name: "Hide Black Flag Tools Parser",
    hint: "Remove only the Black Flag Tools parser button when both modules are active; all other Black Flag Tools features remain available.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}

// src/paused-overlay.js
function registerPausedOverlayHook() {
  Hooks.on("renderGamePause", (_app, html) => {
    if (!game.settings.get(MODULE_ID, SETTINGS.PAUSE_OVERLAY_ENABLED)) return;
    const ourHooks = Hooks.events.renderGamePause.filter(
      (h) => h.toString().includes(MODULE_ID)
    );
    if (Hooks.events.renderGamePause.length > ourHooks.length + 1) return;
    const tovInstalled = game.modules.get(TOV_MODULE_ID)?.active ?? false;
    const imageChoice = game.settings.get(MODULE_ID, SETTINGS.PAUSE_OVERLAY_IMAGE);
    const imgSrc = imageChoice === "tov-mark" && tovInstalled ? "modules/kp-tov-players-guide/assets/furniture/ToV-Mark.webp" : `modules/${MODULE_ID}/assets/black_flag_icon.webp`;
    html.classList.add("bfe-pause");
    const container = document.createElement("div");
    container.className = "flexcol bfe-pause-container";
    container.append(...html.children);
    html.append(container);
    const img = html.querySelector("img");
    if (img) {
      img.src = imgSrc;
      img.className = imageChoice === "tov-mark" && tovInstalled ? "bfe-pause-img bfe-pause-img-tov" : "bfe-pause-img";
    }
  });
}

// src/parser/html.js
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}
function enrichTraitLine(line) {
  const match = line.match(/^([^.:]{2,80})\.\s+(.*)$/);
  if (!match) return `<p>${escapeHTML(line)}</p>`;
  return `<p><em><strong>${escapeHTML(match[1])}.</strong></em> ${escapeHTML(match[2])}</p>`;
}
function linesToHtml(lines, { traitStyle = true } = {}) {
  const html = [];
  for (const raw of lines) {
    const line = String(raw || "").trim();
    if (!line) continue;
    if (/^[-•*]\s+/.test(line)) html.push(`<p>\u2022 ${escapeHTML(line.replace(/^[-•*]\s+/, ""))}</p>`);
    else if (traitStyle && /^[^.:]{2,80}\.\s+/.test(line)) html.push(enrichTraitLine(line));
    else if (/^[A-Z][A-Za-z /-]{2,80}$/.test(line)) html.push(`<h5>${escapeHTML(line)}</h5>`);
    else html.push(`<p>${escapeHTML(line)}</p>`);
  }
  return html.join("\n");
}
function makeDescription(html) {
  return { value: html || "", chat: "", unidentified: "" };
}

// src/parser/common-traits.js
var DARKVISION_ICON = "icons/creatures/eyes/humanoid-single-blind.webp";
var DARKVISION_ADVANCEMENT_ID = "bfeDarkvision000";
var DARKVISION_KEY = "system.traits.senses.types.darkvision";
var MODE_UPGRADE = 4;
function darkvisionDistance(text = "") {
  const match = String(text).match(/\b(\d{2,3})\s*(?:feet|ft\.?)/i);
  return match?.[1] ?? null;
}
function darkvisionEnhancement(trait) {
  if (!/\bdarkvision\b/i.test(trait?.name ?? "")) return null;
  const value = darkvisionDistance(trait.text);
  if (!value) return null;
  return {
    img: DARKVISION_ICON,
    system: {
      advancement: {
        [DARKVISION_ADVANCEMENT_ID]: {
          _id: DARKVISION_ADVANCEMENT_ID,
          configuration: {
            changes: [{ key: DARKVISION_KEY, mode: MODE_UPGRADE, value }]
          },
          flags: {},
          hint: trait.text,
          icon: null,
          level: { value: 0, classIdentifier: "" },
          title: trait.name,
          type: "property"
        }
      }
    }
  };
}
var COMMON_TRAIT_ENHANCERS = [darkvisionEnhancement];
function commonTraitEnhancement(trait) {
  for (const enhance of COMMON_TRAIT_ENHANCERS) {
    const result = enhance(trait);
    if (result) return result;
  }
  return {};
}

// src/parser/concept-parsers.js
var LINEAGE_TRAIT_SKIP = /* @__PURE__ */ new Set(["age", "size", "speed"]);
var HERITAGE_LANGUAGE_ADVANCEMENT_ID = "bfeLanguages0000";
var DEFAULT_HERITAGE_LANGUAGE_TEXT = "You know Common and one additional language of your choice.";
function toTitleCase(value = "") {
  return String(value).trim().toLowerCase().replace(/\b[\p{L}\p{N}'’]+/gu, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
function normalizeInlineText(lines = []) {
  return lines.map((l) => String(l || "").trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
function descriptionSentences(lines = []) {
  const text = normalizeInlineText(lines);
  if (!text) return [];
  return text.match(/[^.!?]+[.!?]+(?:["”’])?|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
}
function isLineageMarker(line, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(?:${escaped}s?\\s+)?lineage\\s+traits$`, "i").test(String(line || "").trim());
}
function cleanPdfText(input = "") {
  const raw = String(input).replace(/\r\n?/g, "\n").replace(/[\u00a0\t]/g, " ");
  const lines = raw.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter((l) => l && !/^\d+$/.test(l) && !/^black flag roleplaying/i.test(l) && !/^tales of the valiant/i.test(l));
  const joined = [];
  for (const line of lines) {
    const prev = joined[joined.length - 1];
    if (prev && /-$/.test(prev) && /^[a-z]/.test(line)) joined[joined.length - 1] = prev.slice(0, -1) + line;
    else joined.push(line);
  }
  return joined;
}
function titleFrom(lines) {
  const idx = lines.findIndex((l) => /^[A-Z][\w'’ -]{2,80}$/.test(l) && !/^(Lineage Traits|Martial Talent|Magic Item|Spell)$/i.test(l));
  return { name: idx >= 0 ? lines[idx] : lines[0] || "Untitled", body: lines.slice(idx + 1) };
}
var SINGULAR_LINEAGE_NAMES = /* @__PURE__ */ new Map([
  ["centaurs", "Centaur"]
]);
function normalizeLineageName(name = "") {
  const title = toTitleCase(name);
  return SINGULAR_LINEAGE_NAMES.get(title.toLowerCase()) ?? title;
}
var LINEAGE_ICON = "systems/black-flag/artwork/types/lineage.svg";
var HERITAGE_ICON = "systems/black-flag/artwork/types/heritage.svg";
var BACKGROUND_ICON = "systems/black-flag/artwork/types/background.svg";
var FEATURE_ICON = "systems/black-flag/artwork/types/feature.svg";
var SIZE_ADVANCEMENT_ID = "bfeSize000000000";
var SPEED_ADVANCEMENT_ID = "bfeSpeed00000000";
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
    ...enhancement.system ?? {}
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
  return rows.filter((row) => row.roll && row.text);
}
function mutationTableHtml(title, lines = []) {
  const rows = parseMutationRows(lines);
  if (!rows.length) return "";
  const body = rows.map((row) => `<tr><td>${escapeHTML(row.roll)}</td><td>${escapeHTML(row.text)}</td></tr>`).join("\n");
  return `<h5>${escapeHTML(toTitleCase(title))}</h5>
<table><thead><tr><th>d6</th><th>Mutation</th></tr></thead><tbody>
${body}
</tbody></table>`;
}
function mutationRowTraits(lines = []) {
  return parseMutationRows(lines).map((row) => {
    const match = parseTraitStart(row.text, { maxWords: 3 });
    return match ? { name: match.name, text: match.rest, lines: [match.rest] } : { name: `Mutation ${row.roll}`, text: row.text, lines: [row.text] };
  });
}
function extractWastelanderMutations(name, lines = []) {
  if (slugify(name) !== "wastelander") return { traitLines: lines, mutationHtml: "", mutationTraits: [] };
  const marker = lines.findIndex((line) => /^wastelander mutations$/i.test(line));
  if (marker < 0) return { traitLines: lines, mutationHtml: "", mutationTraits: [] };
  const mutationLines = lines.slice(marker + 1);
  return {
    traitLines: lines.slice(0, marker),
    mutationHtml: mutationTableHtml(lines[marker], mutationLines),
    mutationTraits: mutationRowTraits(mutationLines)
  };
}
function attachTraitHtml(traits, traitName, html) {
  if (!html) return;
  const trait = traits.find((t) => t.name.toLowerCase() === traitName.toLowerCase());
  if (trait) trait.html = [trait.html, html].filter(Boolean).join("\n");
}
function traitHtml(trait) {
  return [linesToHtml([traitLine(trait)]), trait.html].filter(Boolean).join("\n");
}
function parseNaturalAdaptationChoices(trait) {
  if (!trait || trait.name.toLowerCase() !== "natural adaptation") return null;
  const choices = [];
  const introLines = [];
  let current = null;
  for (const rawLine of trait.lines ?? []) {
    const line = String(rawLine || "").trim();
    const match = line.match(/^[•\-*]\s*(Ogre|Troll|Fey)\.\s*(.*)$/i);
    if (match) {
      if (current) choices.push({ ...current, text: normalizeInlineText(current.lines) });
      current = { name: `${toTitleCase(match[1])} Ancestor`, label: toTitleCase(match[1]), lines: [] };
      if (match[2]) current.lines.push(match[2]);
    } else if (current) current.lines.push(line);
    else introLines.push(line);
  }
  if (current) choices.push({ ...current, text: normalizeInlineText(current.lines) });
  if (!choices.length) return null;
  const intro = normalizeInlineText(introLines);
  const list = choices.map((choice) => `<li><strong>${escapeHTML(choice.label)}.</strong> ${escapeHTML(choice.text)}</li>`).join("\n");
  const html = `${linesToHtml([`Natural Adaptation. ${intro}`])}
<ul>
${list}
</ul>`;
  const relatedTraits = choices.map((choice) => ({ name: choice.name, text: choice.text, lines: [choice.text] }));
  return { html, relatedTraits };
}
function parseTraitSection({ name, type, before, traitLines, category, skippedTraits = /* @__PURE__ */ new Set(), header = null, img = "icons/svg/book.svg", extraAdvancement = () => null, maxTraitWords = 4, extraTraitHtml = null, extraRelatedTraits = [], fallbackTraits = [] }) {
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
      traitBlocks.push(traitHtml(trait));
    } else if (skippedTraits.has(key)) traitBlocks.push(traitHtml(trait));
    else {
      const naturalAdaptation = parseNaturalAdaptationChoices(trait);
      if (naturalAdaptation) {
        traitBlocks.push(naturalAdaptation.html);
        for (const choice of naturalAdaptation.relatedTraits) related.push(featureItem(choice, name, category));
      } else {
        traitBlocks.push(traitHtml(trait));
        related.push(featureItem(trait, name, category));
      }
    }
  }
  for (const trait of fallbackTraits) {
    const key = trait.name.toLowerCase();
    if (traits.some((existing) => existing.name.toLowerCase() === key)) continue;
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
function parseLineage(input) {
  const lines = cleanPdfText(input);
  const name = normalizeLineageName(lines[0] || "Untitled");
  const body = lines.slice(1);
  const marker = body.findIndex((l) => isLineageMarker(l, name));
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
function parseHeritage(input) {
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
    skippedTraits: /* @__PURE__ */ new Set(["languages"]),
    extraAdvancement: languageAdvancement,
    maxTraitWords: 3,
    img: HERITAGE_ICON,
    extraTraitHtml: { traitName: "Beneficial Mutation", html: mutationHtml },
    extraRelatedTraits: mutationTraits,
    fallbackTraits: [{ name: "Languages", text: DEFAULT_HERITAGE_LANGUAGE_TEXT, lines: [DEFAULT_HERITAGE_LANGUAGE_TEXT] }]
  });
}
var BACKGROUND_INLINE_ADVANCEMENTS = ["Skill Proficiencies", "Additional Proficiencies", "Equipment"];
var BACKGROUND_SECTION_HEADINGS = ["Talent", "Adventuring Motivation"];
var BACKGROUND_ADVANCEMENT_IDS = {
  skills: "bfeSkillProfs000",
  additional: "bfeAdditional000",
  equipment: "bfeEquipment0000",
  talent: "bfeTalent0000000"
};
var SKILL_NAME_KEYS = {
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
var NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
var TOOL_NAME_KEYS = {
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
  return rows.filter((row) => row.roll && row.text);
}
function backgroundTableHtml(headerLine, lines = []) {
  const match = String(headerLine || "").match(/^(d\d+)\s+(.+)$/i);
  if (!match) return "";
  const rows = backgroundTableRows(lines);
  if (!rows.length) return "";
  const body = rows.map((row) => `<tr><td>${escapeHTML(row.roll)}</td><td>${escapeHTML(row.text)}</td></tr>`).join("\n");
  return `<table><thead><tr><th>${escapeHTML(match[1])}</th><th>${escapeHTML(toTitleCase(match[2]))}</th></tr></thead><tbody>
${body}
</tbody></table>`;
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
  return match[1].split(/,|\bor\b/i).map((part) => toTitleCase(part)).filter(Boolean);
}
function toolGrantKeysFromText(text = "") {
  const normalized = String(text).toLowerCase();
  const grants = [];
  for (const [label, key] of Object.entries(TOOL_NAME_KEYS)) {
    if (new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i").test(normalized)) grants.push(`tools:${key}`);
  }
  return [...new Set(grants)];
}
function normalizeEquipmentName(text = "") {
  return String(text).trim().replace(/[.。]$/u, "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/^a\s+set\s+of\s+/i, "").replace(/^a\s+pack\s+of\s+/i, "").replace(/^set\s+of\s+/i, "").replace(/^pack\s+of\s+/i, "").replace(/^(?:a|an|the|one)\s+/i, "").replace(/^five\s+/i, "").replace(/^\d+\s+/i, "").trim();
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
  const withoutCurrency = normalized.replace(/(?:,?\s*(?:and\s+)?)?a\s+pouch\s+containing\s+\d+\s*(?:gp|gold(?:\s+pieces?)?)/i, "").replace(/(?:,?\s*(?:and\s+)?)?\d+\s*(?:gp|gold(?:\s+pieces?)?)/i, "");
  for (const rawPart of withoutCurrency.split(/,(?![^()]*\))/)) {
    const part = rawPart.trim().replace(/^and\s+/i, "");
    const partWithoutParentheticals = part.replace(/\s*\([^)]*\)\s*/g, " ");
    if (!part) continue;
    if (/\bor\b/i.test(partWithoutParentheticals)) {
      const options = partWithoutParentheticals.split(/\bor\b/i).map((option) => equipmentEntry(option, countFromEquipmentPart(option))).filter((e) => e.name);
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
    configuration: { choiceMode: "inclusive", choices: [{ count: numberFromText(text, 2), pool: skills.map((skill) => `skills:${skill}`) }], grants: [], mode: "default" },
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
  if (/\bone\s+(?:type\s+of\s+)?tool\s+or\s+gaming\s+set\s+of\s+your\s+choice\b/i.test(text)) choices.push({ count: 1, pool: ["tools:*", "tools:gaming:*"] });
  return {
    _id: BACKGROUND_ADVANCEMENT_IDS.additional,
    configuration: { choiceMode: "inclusive", choices, grants: toolGrantKeysFromText(text), mode: "default" },
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
function parseBackground(input) {
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
    const advancement2 = backgroundInlineAdvancement(line);
    if (advancement2) {
      flushIntro();
      flushInline();
      flushSection();
      inline = { ...advancement2, lines: advancement2.rest ? [advancement2.rest] : [] };
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
function parseTalent(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const categoryLine = body.find((l) => /talent/i.test(l)) || "Talent";
  const category = /martial/i.test(categoryLine) ? "martial" : /magic/i.test(categoryLine) ? "magic" : "general";
  return { primary: baseItem(name, "talent", linesToHtml(body), { type: { category } }) };
}

// src/parser/parse-input.js
var PARSER_TYPES = {
  spell: { label: "BF.Item.Type.Spell[one]", fallbackLabel: "Spell", template: `modules/${MODULE_ID}/templates/parser/types/spell-output.hbs` },
  ammunition: { label: "BF.Item.Type.Ammunition[one]", fallbackLabel: "Ammunition", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  armor: { label: "BF.Item.Type.Armor[one]", fallbackLabel: "Armor", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  weapon: { label: "BF.Item.Type.Weapon[one]", fallbackLabel: "Weapon", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  enchantment: { label: "BF.EFFECT.Type.Enchantment[one]", fallbackLabel: "Enchantment", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  consumable: { label: "BF.Item.Type.Consumable[one]", fallbackLabel: "Consumable", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  container: { label: "BF.Item.Type.Container[one]", fallbackLabel: "Container", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  gear: { label: "BF.Item.Gear.Category.WondrousItem[one]", fallbackLabel: "Wondrous Item", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  staff: { label: "BF.Item.Gear.Category.Staff[one]", fallbackLabel: "Staff", group: "BFE.Parser.MagicItem", groupFallback: "Magic Item", template: `modules/${MODULE_ID}/templates/parser/types/magic-item-output.hbs` },
  lineage: { label: "BFE.Parser.Type.Lineage", fallbackLabel: "Lineage", group: "BFE.Parser.Character", groupFallback: "Character", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  heritage: { label: "BFE.Parser.Type.Heritage", fallbackLabel: "Heritage", group: "BFE.Parser.Character", groupFallback: "Character", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  background: { label: "BFE.Parser.Type.Background", fallbackLabel: "Background", group: "BFE.Parser.Character", groupFallback: "Character", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  talent: { label: "BFE.Parser.Type.Talent", fallbackLabel: "Talent", group: "BFE.Parser.Character", groupFallback: "Character", template: `modules/${MODULE_ID}/templates/parser/types/talent-output.hbs` }
};
function firstTitle(lines) {
  return lines.find((l) => /^[A-Z][\w'’ -]{2,80}$/.test(l)) || "Untitled";
}
function descAfterTitle(lines, name) {
  const i = lines.indexOf(name);
  return lines.slice(i + 1);
}
function item(name, type, html, system = {}) {
  return { name, type, img: "icons/svg/item-bag.svg", system: { description: makeDescription(html), ...system } };
}
function parseSpell(input) {
  const lines = cleanPdfText(input);
  const name = firstTitle(lines);
  const body = descAfterTitle(lines, name);
  const level = body.find((l) => /cantrip|\d+(?:st|nd|rd|th)-level/i.test(l)) || "";
  return { primary: item(name, "spell", linesToHtml(body), { level, activities: {} }) };
}
function parseMagicItem(input, fallbackType = "gear") {
  const lines = cleanPdfText(input);
  const name = firstTitle(lines);
  const body = descAfterTitle(lines, name);
  const text = lines.join("\n");
  const type = /armor/i.test(text) ? "armor" : /weapon/i.test(text) ? "weapon" : fallbackType;
  return { primary: item(name, type, linesToHtml(body), { attunement: { value: /requires attunement/i.test(text) ? "required" : "none", requirement: "" }, rarity: "", price: { label: "\u2014" }, type: { label: PARSER_TYPES[type]?.fallbackLabel ?? type } }) };
}
function parseEnchantment(input) {
  return parseMagicItem(input, "enchantment");
}
function normalizeParseResult(result) {
  if (result?.primary) return { related: [], ...result };
  return { primary: result, related: [] };
}
function parseInput(type, input) {
  switch (type) {
    case "spell":
      return parseSpell(input);
    case "ammunition":
    case "armor":
    case "weapon":
    case "consumable":
    case "container":
    case "gear":
    case "staff":
      return parseMagicItem(input, type === "staff" ? "gear" : type);
    case "enchantment":
      return parseEnchantment(input);
    case "lineage":
      return parseLineage(input);
    case "heritage":
      return parseHeritage(input);
    case "background":
      return parseBackground(input);
    case "talent":
      return parseTalent(input);
    default:
      throw new Error(`Unsupported parser type: ${type}`);
  }
}

// src/parser/parsing-application.js
var { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
var FEATURES_ADVANCEMENT_ID = "bfeFeatures00000";
var PARSER_SOURCES = [
  { value: "", label: "No Source" },
  { value: "KP-LH1", label: "KP-LH1 \u2014 Lineages & Heritages Supplement 1" },
  { value: "KP-MLH", label: "KP-MLH \u2014 Midgard Lineages & Heritages" },
  { value: "KP-PG2", label: "KP-PG2 \u2014 KP Player's Guide 2" },
  { value: "KP-NW", label: "KP-NW \u2014 KP Northlands Worldbook" },
  { value: "KP-NS", label: "KP-NS \u2014 KP Northlands Sagas" },
  { value: "KP-DR", label: "KP-DR \u2014 KP Dungeons & Ruins" },
  { value: "KP-TOM", label: "KP-TOM \u2014 KP The Old Margreve" },
  { value: "KP-LW", label: "KP-LW \u2014 KP Labyrinth Worldbook" },
  { value: "KP-LA", label: "KP-LA \u2014 KP Labyrinth Adventures" }
];
function localizeLabel(key, fallback = key) {
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
}
function optionGroups(types, selected) {
  return Object.entries(types).map(([value, data]) => ({
    value,
    label: localizeLabel(data.label, data.fallbackLabel ?? value),
    group: data.group ? localizeLabel(data.group, data.groupFallback ?? "") : "",
    selected: selected === value
  }));
}
async function renderDescription(html = "") {
  return TextEditor.enrichHTML(html, { secrets: true });
}
function previewDescription(item2) {
  let html = item2.system?.description?.value ?? "";
  const size = item2.system?.advancement?.bfeSize000000000;
  if (size?.hint) {
    const text = escapeHTML(String(size.hint).replace(/^Size\.\s*/i, ""));
    html = html.replace(/@Embed\[\.Advancement\.bfeSize000000000 inline\]\{Size\}/g, `<em><strong>Size.</strong></em> ${text}`);
  }
  return html;
}
function sourceOptions(selected = "") {
  return PARSER_SOURCES.map((option) => ({ ...option, selected: selected === option.value }));
}
function applySource(data, source) {
  const item2 = foundry.utils.deepClone(data);
  item2.system ??= {};
  item2.system.description ??= {};
  item2.system.description.source ??= {};
  item2.system.description.source.book = source;
  return item2;
}
function isConceptWithFeatures(type) {
  return ["lineage", "heritage"].includes(type);
}
function backgroundTalentNames(primary) {
  return primary?.flags?.[MODULE_ID]?.talentNames ?? primary?.flags?.["black-flag-enhancements"]?.talentNames ?? [];
}
function backgroundEquipmentEntries(primary) {
  return primary?.flags?.[MODULE_ID]?.equipment ?? primary?.flags?.["black-flag-enhancements"]?.equipment ?? [];
}
function normalizeLookupName(name = "") {
  return String(name).toLowerCase().normalize("NFKD").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
var EQUIPMENT_ALIASES = /* @__PURE__ */ new Map([
  ["hand mirror", "Compact Mirror"],
  ["mirror", "Compact Mirror"],
  ["playing cards", "Card Set"],
  ["pack of playing cards", "Card Set"],
  ["cards", "Card Set"],
  ["dice", "Dice Set"],
  ["set of dice", "Dice Set"],
  ["gp", "Gold"]
]);
function equipmentLookupNames(name = "") {
  const normalized = normalizeLookupName(name);
  const singular = normalized.replace(/s$/, "");
  const alias = EQUIPMENT_ALIASES.get(normalized) ?? EQUIPMENT_ALIASES.get(singular);
  return [alias, name, singular].filter(Boolean).map(normalizeLookupName);
}
function sortBackgroundItemPacks(packs) {
  return [...packs].sort((a, b) => {
    const aid = `${a.collection} ${a.title}`.toLowerCase();
    const bid = `${b.collection} ${b.title}`.toLowerCase();
    const rank = (id) => id.includes("tov") || id.includes("player") ? 0 : id.includes("bfrd") || id.includes("black-flag") ? 1 : 2;
    return rank(aid) - rank(bid);
  });
}
function sortTalentPacks(packs) {
  return sortBackgroundItemPacks(packs);
}
async function resolveTalentPool(talentNames = []) {
  const names = talentNames.map((name) => String(name || "").trim()).filter(Boolean);
  if (!names.length) return [];
  const wanted = new Map(names.map((name) => [name.toLowerCase(), name]));
  const matches = /* @__PURE__ */ new Map();
  const packs = sortTalentPacks(game.packs.filter((pack) => pack.documentName === "Item"));
  for (const pack of packs) {
    const id = `${pack.collection} ${pack.title}`.toLowerCase();
    if (!/(tov|player|bfrd|black-flag)/.test(id)) continue;
    const index = await pack.getIndex({ fields: ["name", "type"] });
    for (const entry of index) {
      const key = String(entry.name || "").toLowerCase();
      if (!wanted.has(key) || matches.has(key)) continue;
      if (entry.type && entry.type !== "talent") continue;
      matches.set(key, { uuid: `Compendium.${pack.collection}.Item.${entry._id}` });
    }
    if (matches.size === wanted.size) break;
  }
  return names.map((name) => matches.get(name.toLowerCase())).filter(Boolean);
}
async function populateBackgroundTalentPool(primary) {
  if (primary.type !== "background") return;
  const advancement = primary.system?.advancement?.bfeTalent0000000;
  if (!advancement) return;
  const pool = await resolveTalentPool(backgroundTalentNames(primary));
  if (pool.length) advancement.configuration.pool = pool;
}
function equipmentEntryId() {
  return foundry.utils.randomID(16);
}
function equipmentPoolEntry(uuid, count, sort, group = "") {
  return {
    type: "linked",
    count: count ?? null,
    key: uuid,
    requiresProficiency: false,
    _id: equipmentEntryId(),
    group,
    sort
  };
}
async function resolveEquipmentUuid(entry, packs) {
  if (!entry?.name) return null;
  const wanted = new Set(equipmentLookupNames(entry.name));
  for (const pack of packs) {
    const id = `${pack.collection} ${pack.title}`.toLowerCase();
    if (!/(tov|player|bfrd|black-flag)/.test(id)) continue;
    const index = await pack.getIndex({ fields: ["name", "type"] });
    for (const item2 of index) {
      if (wanted.has(normalizeLookupName(item2.name))) return `Compendium.${pack.collection}.Item.${item2._id}`;
    }
  }
  return null;
}
async function resolveEquipmentPool(equipment = []) {
  if (!equipment.length) return [];
  const packs = sortBackgroundItemPacks(game.packs.filter((pack) => pack.documentName === "Item"));
  const pool = [];
  let sort = 1e5;
  for (const entry of equipment) {
    if (entry.group === "OR") {
      const children = [];
      for (const option of entry.options ?? []) {
        const uuid = await resolveEquipmentUuid(option, packs);
        if (uuid) children.push({ uuid, count: option.count ?? null });
      }
      if (!children.length) continue;
      if (children.length === 1) {
        pool.push(equipmentPoolEntry(children[0].uuid, children[0].count, sort));
        sort += 1e5;
        continue;
      }
      const group = equipmentEntryId();
      pool.push({ type: "OR", requiresProficiency: false, _id: group, group: "", sort });
      sort += 1e5;
      for (const child of children) {
        pool.push(equipmentPoolEntry(child.uuid, child.count, sort, group));
        sort += 1e5;
      }
    } else {
      const uuid = await resolveEquipmentUuid(entry, packs);
      if (!uuid) continue;
      pool.push(equipmentPoolEntry(uuid, entry.count ?? null, sort));
      sort += 1e5;
    }
  }
  return pool;
}
async function populateBackgroundEquipmentPool(primary) {
  if (primary.type !== "background") return;
  const advancement = primary.system?.advancement?.bfeEquipment0000;
  if (!advancement) return;
  const pool = await resolveEquipmentPool(backgroundEquipmentEntries(primary));
  if (pool.length) advancement.configuration.pool = pool;
}
function packFolders(pack) {
  return Array.from(pack?.folders ?? []);
}
async function getOrCreatePackFolder(pack, name, parent = null) {
  const packId = pack.metadata.id;
  const parentId = parent?.id ?? parent ?? null;
  const existing = packFolders(pack).find((folder) => folder.name === name && (folder.folder?.id ?? folder.folder ?? null) === parentId);
  if (existing) return existing;
  const [created] = await Folder.createDocuments([{ name, type: "Item", folder: parentId }], { pack: packId });
  pack.folders?.push?.(created);
  return created;
}
async function parserTargetFolders(pack, primary, selectedFolder = null) {
  if (!isConceptWithFeatures(primary.type)) return { primaryFolder: selectedFolder, featureFolder: selectedFolder };
  const primaryFolder = await getOrCreatePackFolder(pack, primary.name, selectedFolder);
  const featureFolder = await getOrCreatePackFolder(pack, `${primary.name} Features`, primaryFolder);
  return { primaryFolder: primaryFolder.id, featureFolder: featureFolder.id };
}
var ParsingApplication = class _ParsingApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static TYPES = PARSER_TYPES;
  static DEFAULT_OPTIONS = {
    id: "black-flag-enhancements-parser",
    classes: ["black-flag", "black-flag-enhancements", "parser"],
    tag: "form",
    form: { handler: _ParsingApplication.#onSubmit, submitOnChange: false, closeOnSubmit: true },
    window: { title: "BFE Parser", icon: "fa-solid fa-file-lines", resizable: true },
    position: { width: 1024, height: 720 }
  };
  static PARTS = {
    input: { template: `modules/${MODULE_ID}/templates/parser/input.hbs` },
    output: { template: `modules/${MODULE_ID}/templates/parser/output.hbs` },
    footer: { template: `modules/${MODULE_ID}/templates/parser/footer.hbs` }
  };
  constructor(packOrOptions, options = {}) {
    const pack = packOrOptions?.metadata ? packOrOptions : packOrOptions?.pack;
    super(options);
    this.pack = pack;
    this._type = game.user.getFlag(MODULE_ID, "lastParserType") || "gear";
    this._input = "";
    this.result = null;
    this.error = null;
  }
  get input() {
    return this.element?.querySelector('[name="input"]')?.value ?? this._input ?? "";
  }
  get type() {
    return this.element?.querySelector('[name="type"]')?.value ?? this._type ?? "gear";
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const lastFolder = game.user.getFlag(MODULE_ID, "lastParserFolder");
    const lastSource = game.user.getFlag(MODULE_ID, "lastParserSource") ?? "";
    return {
      ...context,
      input: this._input,
      error: this.error,
      preview: await this.#renderPreview(),
      types: {
        field: new foundry.data.fields.StringField(),
        options: optionGroups(this.constructor.TYPES, this._type)
      },
      sources: {
        field: new foundry.data.fields.StringField(),
        options: sourceOptions(lastSource)
      },
      folders: {
        field: new foundry.data.fields.StringField(),
        options: [
          { value: "", label: "No Folder", selected: !lastFolder },
          ...(this.pack?._formatFolderSelectOptions?.() ?? []).map(({ id, name }) => ({ value: id, label: name, selected: id === lastFolder }))
        ]
      }
    };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector('textarea[name="input"]')?.addEventListener("input", (event) => {
      this._input = event.currentTarget.value;
      this.#parse();
      this.render({ parts: ["output"] });
    });
    this.element.querySelector('select[name="type"]')?.addEventListener("change", (event) => {
      this._type = event.currentTarget.value;
      this.#parse();
      this.render({ parts: ["output"] });
    });
  }
  #parse() {
    try {
      this.error = null;
      this.result = this.input.trim() ? normalizeParseResult(parseInput(this.type, this.input)) : null;
    } catch (err) {
      this.error = err.message;
      this.result = null;
    }
  }
  async #renderPreview() {
    this.#parse();
    if (!this.result) return "";
    const item2 = this.result.primary;
    const template = this.constructor.TYPES[this.type]?.template ?? `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs`;
    return renderTemplate(template, {
      CONFIG: CONFIG.BlackFlag,
      item: item2,
      result: this.result,
      related: this.result.related ?? [],
      enriched: { description: await renderDescription(previewDescription(item2)) }
    });
  }
  static async #onSubmit(event, _form, formData) {
    event.preventDefault();
    const app = this;
    app._input = formData.object.input || app.input;
    app._type = formData.object.type || app.type;
    app.#parse();
    if (!app.result) return app.render();
    const source = formData.object.source ?? "";
    const created = await app.saveResult(app.result, formData.object.folder || null, source);
    await game.user.setFlag(MODULE_ID, "lastParserType", app._type);
    await game.user.setFlag(MODULE_ID, "lastParserSource", source);
    if (formData.object.folder !== void 0) await game.user.setFlag(MODULE_ID, "lastParserFolder", formData.object.folder);
    ui.notifications.info(`Created ${created.name}!`);
    created?.sheet?.render(true);
  }
  async saveResult(result, folder = null, source = "") {
    const packId = this.pack.metadata.id;
    const primary = applySource(result.primary, source);
    const { primaryFolder, featureFolder } = await parserTargetFolders(this.pack, primary, folder);
    const related = [];
    for (const data of result.related ?? []) {
      const [created] = await Item.createDocuments([{ ...applySource(data, source), folder: featureFolder }], { pack: packId });
      related.push(created);
    }
    if (related.length && isConceptWithFeatures(primary.type)) {
      primary.system ??= {};
      primary.system.advancement ??= {};
      primary.system.advancement[FEATURES_ADVANCEMENT_ID] = {
        _id: FEATURES_ADVANCEMENT_ID,
        configuration: { enabled: true, pool: related.map((doc) => ({ uuid: doc.uuid })) },
        flags: {},
        icon: null,
        level: { value: 0 },
        title: "",
        type: "grantFeatures"
      };
    }
    await populateBackgroundTalentPool(primary);
    await populateBackgroundEquipmentPool(primary);
    const [createdPrimary] = await Item.createDocuments([{ ...primary, folder: primaryFolder }], { pack: packId });
    return createdPrimary;
  }
  static injectSidebarButton(app, html) {
    const pack = app.collection;
    if (game.system.id !== "black-flag") return;
    if (pack?.metadata?.type !== "Item" || pack.locked) return;
    if (!game.settings.get(MODULE_ID, SETTINGS.PARSER_ENABLED)) return;
    const root = html instanceof HTMLElement ? html : html?.[0];
    const actions = root?.querySelector(".header-actions");
    if (!actions || actions.querySelector("button.bfe-parse")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "parse bfe-parse";
    button.dataset.action = "bfe-parse";
    button.innerHTML = `<i class="fa-solid fa-file-lines" inert></i> BFE Parser`;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      new this({ pack }).render({ force: true });
    });
    actions.append(button);
  }
};
function registerParserHooks() {
  Hooks.on("renderCompendium", (app, html) => ParsingApplication.injectSidebarButton(app, html));
}

// src/parser/black-flag-tools-interop.js
function removeBlackFlagToolsParserButton(root, { enabled = true, bftActive = true, bftTitle = "Parse Document" } = {}) {
  if (!enabled || !bftActive || !root?.querySelectorAll) return 0;
  let removed = 0;
  const title = String(bftTitle || "Parse Document").trim();
  for (const button of root.querySelectorAll('.header-actions button.parse[data-action="parse"]')) {
    if (button.classList.contains("bfe-parse")) continue;
    const text = button.textContent?.trim() || button.getAttribute("title") || button.getAttribute("aria-label") || "";
    if (text.includes(title) || text.includes("Parse Document")) {
      button.remove();
      removed += 1;
    }
  }
  return removed;
}
function registerBlackFlagToolsInterop() {
  Hooks.on("renderCompendium", (_app, html) => {
    const run = () => {
      if (!game.settings.get(MODULE_ID, SETTINGS.SUPPRESS_BLACK_FLAG_TOOLS_PARSER)) return;
      if (!game.modules.get(BFT_MODULE_ID)?.active) return;
      const root = html instanceof HTMLElement ? html : html?.[0];
      removeBlackFlagToolsParserButton(root, { enabled: true, bftActive: true, bftTitle: game.i18n.localize("BFTools.Parser.Title") });
    };
    run();
    queueMicrotask(run);
    setTimeout(run, 0);
  });
}

// src/module.js
Hooks.once("init", registerSettings);
registerPausedOverlayHook();
Hooks.once("setup", () => {
  if (game.system.id !== "black-flag") return;
  registerParserHooks();
  registerBlackFlagToolsInterop();
  globalThis.BlackFlagEnhancements = { parseInput, ParsingApplication };
});
export {
  ParsingApplication,
  parseInput
};
