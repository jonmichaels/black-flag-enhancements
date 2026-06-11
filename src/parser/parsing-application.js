import { MODULE_ID, SETTINGS } from "../constants.js";
import { parseInput, PARSER_TYPES, normalizeParseResult } from "./parse-input.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ParsingApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static TYPES = PARSER_TYPES;
  static DEFAULT_OPTIONS = {
    id: "black-flag-enhancements-parser",
    classes: ["black-flag-enhancements", "parser"],
    tag: "form",
    form: { handler: ParsingApplication.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    window: { title: "BFE.Parser.Title", resizable: true },
    position: { width: 640, height: 620 }
  };
  static PARTS = {
    input: { template: `modules/${MODULE_ID}/templates/parser/input.hbs` },
    output: { template: `modules/${MODULE_ID}/templates/parser/output.hbs` },
    footer: { template: `modules/${MODULE_ID}/templates/parser/footer.hbs` }
  };

  constructor(pack, options = {}) { super(options); this.pack = pack; this.type = game.user.getFlag(MODULE_ID, "lastParserType") || "spell"; this.input = ""; this.result = null; this.error = null; }
  async _prepareContext() { return { input: this.input, result: this.result, error: this.error, type: this.type, types: this.constructor.TYPES, folders: this.pack.folders ?? [] }; }
  async _onRender(context, options) { await super._onRender(context, options); this.element.querySelector("textarea[name='input']")?.addEventListener("input", ev => { this.input = ev.currentTarget.value; this.#parse(); this.render({ parts: ["output"] }); }); this.element.querySelector("select[name='type']")?.addEventListener("change", ev => { this.type = ev.currentTarget.value; game.user.setFlag(MODULE_ID, "lastParserType", this.type); this.#parse(); this.render({ parts: ["output"] }); }); }
  #parse() { try { this.error = null; this.result = this.input.trim() ? normalizeParseResult(parseInput(this.type, this.input)) : null; } catch (err) { this.error = err.message; this.result = null; } }
  static async #onSubmit(event, _form, formData) { event.preventDefault(); const app = this; app.input = formData.object.input || app.input; app.type = formData.object.type || app.type; app.#parse(); if (!app.result) return app.render(); const created = await app.saveResult(app.result, formData.object.folder || null); created?.sheet?.render(true); }

  async saveResult(result, folder = null) {
    const packId = this.pack.metadata.id;
    const related = [];
    const uuidMap = new Map();
    for (const data of result.related ?? []) {
      const [created] = await Item.createDocuments([{ ...data, folder }], { pack: packId });
      related.push(created); uuidMap.set(created.name, created.uuid);
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
    button.type = "button"; button.className = "bfe-parse"; button.dataset.action = "bfe-parse"; button.textContent = game.i18n.localize("BFE.Parser.Title") || "Parse Document";
    button.addEventListener("click", ev => { ev.preventDefault(); new this(pack).render(true); });
    actions.append(button);
  }
}

export function registerParserHooks() {
  Hooks.on("renderCompendium", (app, html) => ParsingApplication.injectSidebarButton(app, html));
}
