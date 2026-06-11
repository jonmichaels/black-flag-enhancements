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
var TRAIT_SKIP = /* @__PURE__ */ new Set(["age", "size", "speed"]);
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
  return new RegExp(`^(?:${escaped}\\s+)?lineage\\s+traits$`, "i").test(String(line || "").trim());
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
var LINEAGE_ICON = "systems/black-flag/artwork/types/lineage.svg";
var FEATURE_ICON = "systems/black-flag/artwork/types/feature.svg";
var SIZE_ADVANCEMENT_ID = "bfeSize000000000";
function baseItem(name, type, html, system = {}, img = "icons/svg/book.svg") {
  return { name, type, img, system: { description: makeDescription(html), ...system } };
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
function endsSentence(line = "") {
  return /[.!?]["”’)]?$/.test(String(line || "").trim());
}
function splitTraits(lines) {
  const traits = [];
  let current = null;
  let previousLine = "";
  for (const line of lines) {
    const match = parseTraitStart(line);
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
function featureItem(trait, lineageName) {
  const enhancement = commonTraitEnhancement(trait);
  return baseItem(trait.name, "feature", linesToHtml([trait.text], { traitStyle: false }), {
    identifier: { associated: slugify(lineageName), value: slugify(trait.name) },
    type: { category: "lineage", value: "" },
    source: lineageName,
    ...enhancement.system ?? {}
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
function parseLineage(input) {
  const lines = cleanPdfText(input);
  const name = toTitleCase(lines[0] || "Untitled");
  const body = lines.slice(1);
  const marker = body.findIndex((l) => isLineageMarker(l, name));
  if (marker < 0) return { primary: baseItem(name, "lineage", linesToHtml(descriptionSentences(body)), { identifier: { value: slugify(name) } }, LINEAGE_ICON), related: [] };
  const before = body.slice(0, marker);
  const traitLines = body.slice(marker + 1);
  const traits = splitTraits(traitLines);
  const related = [];
  const traitBlocks = [];
  const advancement = {};
  for (const trait of traits) {
    const key = trait.name.toLowerCase();
    if (key === "size") {
      const size = sizeAdvancement(trait);
      if (size) advancement[SIZE_ADVANCEMENT_ID] = size;
      traitBlocks.push(traitLine(trait));
    } else if (TRAIT_SKIP.has(key)) traitBlocks.push(traitLine(trait));
    else {
      traitBlocks.push(traitLine(trait));
      related.push(featureItem(trait, name));
    }
  }
  const html = [
    linesToHtml(descriptionSentences(before)),
    `<h4>${escapeHTML(`${name} Lineage Traits`)}</h4>`,
    linesToHtml(traitBlocks)
  ].filter(Boolean).join("\n");
  return { primary: baseItem(name, "lineage", html, { advancement, identifier: { value: slugify(name) } }, LINEAGE_ICON), related };
}
function parseHeritage(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  return { primary: baseItem(name, "heritage", linesToHtml(body)) };
}
function parseBackground(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const html = linesToHtml(body, { traitStyle: false }).replace(/<p>(Skill Proficiencies:[^<]+)<\/p>/gi, "<h5>Skill Proficiencies</h5><p>$1</p>").replace(/<p>(Equipment:[^<]+)<\/p>/gi, "<h5>Equipment</h5><p>$1</p>").replace(/<p>(Talent:[^<]+)<\/p>/gi, "<h5>Talent</h5><p>$1</p>");
  return { primary: baseItem(name, "background", html) };
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
  lineage: { label: "BFE.Parser.Type.Lineage", fallbackLabel: "Lineage", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  heritage: { label: "BFE.Parser.Type.Heritage", fallbackLabel: "Heritage", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  background: { label: "BFE.Parser.Type.Background", fallbackLabel: "Background", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs` },
  talent: { label: "BFE.Parser.Type.Talent", fallbackLabel: "Talent", group: "BFE.Parser.Concept", groupFallback: "Concept", template: `modules/${MODULE_ID}/templates/parser/types/talent-output.hbs` }
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
    return {
      ...context,
      input: this._input,
      error: this.error,
      preview: await this.#renderPreview(),
      types: {
        field: new foundry.data.fields.StringField(),
        options: optionGroups(this.constructor.TYPES, this._type)
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
    const created = await app.saveResult(app.result, formData.object.folder || null);
    await game.user.setFlag(MODULE_ID, "lastParserType", app._type);
    if (formData.object.folder !== void 0) await game.user.setFlag(MODULE_ID, "lastParserFolder", formData.object.folder);
    ui.notifications.info(`Created ${created.name}!`);
    created?.sheet?.render(true);
  }
  async saveResult(result, folder = null) {
    const packId = this.pack.metadata.id;
    const related = [];
    for (const data of result.related ?? []) {
      const [created] = await Item.createDocuments([{ ...data, folder }], { pack: packId });
      related.push(created);
    }
    const primary = foundry.utils.deepClone(result.primary);
    if (related.length && primary.type === "lineage") {
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
    const [createdPrimary] = await Item.createDocuments([{ ...primary, folder }], { pack: packId });
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
