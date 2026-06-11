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
    const related = [];
    for (const data of result.related ?? []) {
      const [created] = await Item.createDocuments([{ ...applySource(data, source), folder }], { pack: packId });
      related.push(created);
    }
    const primary = applySource(result.primary, source);
    if (related.length && primary.type === "lineage") {
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
