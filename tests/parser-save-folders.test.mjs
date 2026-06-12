import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadParsingApplication() {
  vi.resetModules();
  globalThis.foundry = {
    applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } },
    data: { fields: { StringField: class {} } },
    utils: { deepClone: value => structuredClone(value) }
  };
  globalThis.game = { i18n: { localize: key => key }, user: { getFlag: vi.fn(), setFlag: vi.fn() }, system: { id: "black-flag" }, settings: { get: vi.fn(() => true) } };
  globalThis.TextEditor = { enrichHTML: vi.fn(async html => html) };
  globalThis.Hooks = { on: vi.fn() };
  globalThis.ui = { notifications: { info: vi.fn() } };
  globalThis.renderTemplate = vi.fn(async () => "");
  return import("../src/parser/parsing-application.js");
}

describe("parser save folders", () => {
  beforeEach(() => {
    delete globalThis.Item;
    delete globalThis.Folder;
  });

  it("creates nested compendium folders for parsed Heritage and places features inside the Features folder", async () => {
    const { ParsingApplication } = await loadParsingApplication();
    const createdFolders = [];
    const createdItems = [];
    globalThis.Folder = {
      createDocuments: vi.fn(async (docs, options) => docs.map(doc => {
        const folder = { id: `folder-${createdFolders.length + 1}`, uuid: `Compendium.world.parser-test-items.Folder.folder-${createdFolders.length + 1}`, ...doc, pack: options.pack };
        createdFolders.push(folder);
        return folder;
      }))
    };
    globalThis.Item = {
      createDocuments: vi.fn(async (docs, options) => docs.map(doc => {
        const item = { id: `item-${createdItems.length + 1}`, uuid: `Compendium.world.parser-test-items.Item.item-${createdItems.length + 1}`, ...doc, pack: options.pack };
        createdItems.push(item);
        return item;
      }))
    };
    const app = Object.create(ParsingApplication.prototype);
    app.pack = { metadata: { id: "world.parser-test-items" }, folders: [] };
    const result = {
      primary: { name: "Sky Dancer", type: "heritage", system: { description: { value: "" } } },
      related: [
        { name: "Glide", type: "feature", system: { description: { value: "" } } },
        { name: "Cloud Step", type: "feature", system: { description: { value: "" } } }
      ]
    };

    const created = await app.saveResult(result, null, "KP-LH1");

    expect(createdFolders.map(f => ({ name: f.name, type: f.type, folder: f.folder ?? null }))).toEqual([
      { name: "Sky Dancer", type: "Item", folder: null },
      { name: "Sky Dancer Features", type: "Item", folder: "folder-1" }
    ]);
    expect(createdItems.map(i => ({ name: i.name, folder: i.folder }))).toEqual([
      { name: "Glide", folder: "folder-2" },
      { name: "Cloud Step", folder: "folder-2" },
      { name: "Sky Dancer", folder: "folder-1" }
    ]);
    expect(created.system.advancement.bfeFeatures00000.configuration.pool).toEqual([
      { uuid: "Compendium.world.parser-test-items.Item.item-1" },
      { uuid: "Compendium.world.parser-test-items.Item.item-2" }
    ]);
  });
});
