import { MODULE_ID, SETTINGS } from "../constants.js";
import { parseInput, PARSER_TYPES, normalizeParseResult } from "./parse-input.js";
import { escapeHTML } from "./html.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const FEATURES_ADVANCEMENT_ID = "bfeFeatures00000";
const PARSER_SOURCES = [
  { value: "", label: "No Source" },
  { value: "KP-LH1", label: "KP-LH1 — Lineages & Heritages Supplement 1" },
  { value: "KP-MLH", label: "KP-MLH — Midgard Lineages & Heritages" },
  { value: "KP-PG2", label: "KP-PG2 — KP Player's Guide 2" },
  { value: "KP-NW", label: "KP-NW — KP Northlands Worldbook" },
  { value: "KP-NS", label: "KP-NS — KP Northlands Sagas" },
  { value: "KP-DR", label: "KP-DR — KP Dungeons & Ruins" },
  { value: "KP-TOM", label: "KP-TOM — KP The Old Margreve" },
  { value: "KP-LW", label: "KP-LW — KP Labyrinth Worldbook" },
  { value: "KP-LA", label: "KP-LA — KP Labyrinth Adventures" }
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

function previewDescription(item) {
  let html = item.system?.description?.value ?? "";
  const size = item.system?.advancement?.bfeSize000000000;
  if (size?.hint) {
    const text = escapeHTML(String(size.hint).replace(/^Size\.\s*/i, ""));
    html = html.replace(/@Embed\[\.Advancement\.bfeSize000000000 inline\]\{Size\}/g, `<em><strong>Size.</strong></em> ${text}`);
  }
  return html;
}

function sourceOptions(selected = "") {
  return PARSER_SOURCES.map(option => ({ ...option, selected: selected === option.value }));
}

function applySource(data, source) {
  const item = foundry.utils.deepClone(data);
  item.system ??= {};
  item.system.description ??= {};
  item.system.description.source ??= {};
  item.system.description.source.book = source;
  return item;
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
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const EQUIPMENT_ALIASES = new Map([
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
    const rank = id => id.includes("tov") || id.includes("player") ? 0 : id.includes("bfrd") || id.includes("black-flag") ? 1 : 2;
    return rank(aid) - rank(bid);
  });
}

function sortTalentPacks(packs) {
  return sortBackgroundItemPacks(packs);
}

async function resolveTalentPool(talentNames = []) {
  const names = talentNames.map(name => String(name || "").trim()).filter(Boolean);
  if (!names.length) return [];
  const wanted = new Map(names.map(name => [name.toLowerCase(), name]));
  const matches = new Map();
  const packs = sortTalentPacks(game.packs.filter(pack => pack.documentName === "Item"));
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
  return names.map(name => matches.get(name.toLowerCase())).filter(Boolean);
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
    for (const item of index) {
      if (wanted.has(normalizeLookupName(item.name))) return `Compendium.${pack.collection}.Item.${item._id}`;
    }
  }
  return null;
}

async function resolveEquipmentPool(equipment = []) {
  if (!equipment.length) return [];
  const packs = sortBackgroundItemPacks(game.packs.filter(pack => pack.documentName === "Item"));
  const pool = [];
  let sort = 100000;
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
        sort += 100000;
        continue;
      }
      const group = equipmentEntryId();
      pool.push({ type: "OR", requiresProficiency: false, _id: group, group: "", sort });
      sort += 100000;
      for (const child of children) {
        pool.push(equipmentPoolEntry(child.uuid, child.count, sort, group));
        sort += 100000;
      }
    } else {
      const uuid = await resolveEquipmentUuid(entry, packs);
      if (!uuid) continue;
      pool.push(equipmentPoolEntry(uuid, entry.count ?? null, sort));
      sort += 100000;
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
  const existing = packFolders(pack).find(folder => folder.name === name && (folder.folder?.id ?? folder.folder ?? null) === parentId);
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

export class ParsingApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static TYPES = PARSER_TYPES;

  static DEFAULT_OPTIONS = {
    id: "black-flag-enhancements-parser",
    classes: ["black-flag", "black-flag-enhancements", "parser"],
    tag: "form",
    form: { handler: ParsingApplication.#onSubmit, submitOnChange: false, closeOnSubmit: true },
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
    this.element.querySelector('textarea[name="input"]')?.addEventListener("input", event => {
      this._input = event.currentTarget.value;
      this.#parse();
      this.render({ parts: ["output"] });
    });
    this.element.querySelector('select[name="type"]')?.addEventListener("change", event => {
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
    const item = this.result.primary;
    const template = this.constructor.TYPES[this.type]?.template ?? `modules/${MODULE_ID}/templates/parser/types/concept-output.hbs`;
    return renderTemplate(template, {
      CONFIG: CONFIG.BlackFlag,
      item,
      result: this.result,
      related: this.result.related ?? [],
      enriched: { description: await renderDescription(previewDescription(item)) }
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
    if (formData.object.folder !== undefined) await game.user.setFlag(MODULE_ID, "lastParserFolder", formData.object.folder);
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
        configuration: { enabled: true, pool: related.map(doc => ({ uuid: doc.uuid })) },
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
    button.addEventListener("click", event => {
      event.preventDefault();
      new this({ pack }).render({ force: true });
    });
    actions.append(button);
  }
}

export function registerParserHooks() {
  Hooks.on("renderCompendium", (app, html) => ParsingApplication.injectSidebarButton(app, html));
}
