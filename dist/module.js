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
    name: "BFE.Settings.ParserEnabled.Name",
    hint: "BFE.Settings.ParserEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false
  });
  game.settings.register(MODULE_ID, SETTINGS.SUPPRESS_BLACK_FLAG_TOOLS_PARSER, {
    name: "BFE.Settings.SuppressBlackFlagToolsParser.Name",
    hint: "BFE.Settings.SuppressBlackFlagToolsParser.Hint",
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

// src/parser/concept-parsers.js
var TRAIT_SKIP = /* @__PURE__ */ new Set(["age", "size", "speed", "languages", "language", "ability score increase", "creature type"]);
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
function baseItem(name, type, html, system = {}) {
  return { name, type, img: "icons/svg/book.svg", system: { description: makeDescription(html), ...system } };
}
function splitTraits(lines) {
  const traits = [];
  let current = null;
  for (const line of lines) {
    const match = line.match(/^([^.:]{2,80})\.\s+(.*)$/);
    if (match) {
      if (current) traits.push(current);
      current = { name: match[1].trim(), lines: [`${match[1].trim()}. ${match[2].trim()}`] };
    } else if (current) current.lines.push(line);
  }
  if (current) traits.push(current);
  return traits;
}
function parseLineage(input) {
  const lines = cleanPdfText(input);
  const { name, body } = titleFrom(lines);
  const marker = body.findIndex((l) => /^Lineage Traits$/i.test(l));
  const before = marker >= 0 ? body.slice(0, marker) : [];
  const traitLines = marker >= 0 ? body.slice(marker + 1) : body;
  const traits = splitTraits(traitLines);
  const related = [];
  const mainBlocks = [...before, "Lineage Traits"];
  for (const trait of traits) {
    const key = trait.name.toLowerCase();
    if (TRAIT_SKIP.has(key)) mainBlocks.push(...trait.lines);
    else {
      const token = `@@BFE_EMBED:${trait.name}@@`;
      mainBlocks.push(`${trait.name}. ${token}`);
      related.push(baseItem(trait.name, "feature", linesToHtml(trait.lines), { source: name }));
    }
  }
  let html = linesToHtml(mainBlocks).replace(/<h5>Lineage Traits<\/h5>/, "<h5>Lineage Traits</h5>");
  html = html.replace(/<p><em><strong>([^<]+)\.<\/strong><\/em> @@BFE_EMBED:([^@]+)@@<\/p>/g, (_m, label, traitName) => `<p><em><strong>${escapeHTML(label)}.</strong></em> @@BFE_EMBED:${traitName}@@</p>`);
  return { primary: baseItem(name, "lineage", html), related };
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
  return { primary: item(name, type, linesToHtml(body), { attunement: /requires attunement/i.test(text) ? "required" : "" }) };
}
function parseEnchantment(input) {
  return parseMagicItem(input, "enchantment");
}
function normalizeParseResult(result) {
  if (result?.primary) return result;
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
var ParsingApplication = class _ParsingApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static TYPES = PARSER_TYPES;
  static DEFAULT_OPTIONS = {
    id: "black-flag-enhancements-parser",
    classes: ["black-flag-enhancements", "parser"],
    tag: "form",
    form: { handler: _ParsingApplication.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    window: { title: "BFE.Parser.Title", resizable: true },
    position: { width: 640, height: 620 }
  };
  static PARTS = {
    input: { template: `modules/${MODULE_ID}/templates/parser/input.hbs` },
    output: { template: `modules/${MODULE_ID}/templates/parser/output.hbs` },
    footer: { template: `modules/${MODULE_ID}/templates/parser/footer.hbs` }
  };
  constructor(pack, options = {}) {
    super(options);
    this.pack = pack;
    this.type = game.user.getFlag(MODULE_ID, "lastParserType") || "spell";
    this.input = "";
    this.result = null;
    this.error = null;
  }
  async _prepareContext() {
    return { input: this.input, result: this.result, error: this.error, type: this.type, types: this.constructor.TYPES, folders: this.pack.folders ?? [] };
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("textarea[name='input']")?.addEventListener("input", (ev) => {
      this.input = ev.currentTarget.value;
      this.#parse();
      this.render({ parts: ["output"] });
    });
    this.element.querySelector("select[name='type']")?.addEventListener("change", (ev) => {
      this.type = ev.currentTarget.value;
      game.user.setFlag(MODULE_ID, "lastParserType", this.type);
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
  static async #onSubmit(event, _form, formData) {
    event.preventDefault();
    const app = this;
    app.input = formData.object.input || app.input;
    app.type = formData.object.type || app.type;
    app.#parse();
    if (!app.result) return app.render();
    const created = await app.saveResult(app.result, formData.object.folder || null);
    created?.sheet?.render(true);
  }
  async saveResult(result, folder = null) {
    const packId = this.pack.metadata.id;
    const related = [];
    const uuidMap = /* @__PURE__ */ new Map();
    for (const data of result.related ?? []) {
      const [created] = await Item.createDocuments([{ ...data, folder }], { pack: packId });
      related.push(created);
      uuidMap.set(created.name, created.uuid);
    }
    const primary = foundry.utils.deepClone(result.primary);
    let html = primary.system?.description?.value ?? "";
    for (const [name, uuid] of uuidMap) html = html.replaceAll(`@@BFE_EMBED:${name}@@`, `@Embed[${uuid} inline]{${name}}`);
    if (primary.system?.description) primary.system.description.value = html;
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
    button.className = "bfe-parse";
    button.dataset.action = "bfe-parse";
    button.textContent = game.i18n.localize("BFE.Parser.Title") || "Parse Document";
    button.addEventListener("click", (ev) => {
      ev.preventDefault();
      new this(pack).render(true);
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
