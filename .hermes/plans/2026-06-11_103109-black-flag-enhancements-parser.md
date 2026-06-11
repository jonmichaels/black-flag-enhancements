# Black Flag Enhancements Parser Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a configurable, standalone Black Flag content parser to `black-flag-enhancements`, preserving existing spell/magic-item parser behavior from `black-flag-tools` as a reference and extending it to create clean, readable lineages, heritages, backgrounds, talents, and lineage trait feature items from messy PDF-pasted text.

**Architecture:** Split the current single-file module into source modules with a build step. Reimplement/adapt the `black-flag-tools` parser behavior into `black-flag-enhancements` with **zero runtime dependency** on `black-flag-tools`, add module-local settings to enable this parser and remove only the visible competing `black-flag-tools` parser button, then extend parser type handling and preview/save logic for Black Flag concept/talent item types. Keep Black Flag data-model choices evidence-backed by QMD docs and live Foundry inspection, with messy PDF-paste cleanup treated as core parser behavior.

**Tech Stack:** Foundry VTT v13, Black Flag system v2.x, ApplicationV2 + HandlebarsApplicationMixin, plain ES modules, Node/Vitest or lightweight Node static tests, Foundry MCP/runtime script validation.

---

## Current Context / Evidence

- Repo: `/home/jon/projects/black-flag-enhancements`
- Current repo has no `CLAUDE.md`, no source tree, and only `dist/module.js` / `dist/module.css` plus `module.json`, `README.md`, assets.
- Current `dist/module.js` only registers paused-overlay settings and a `renderGamePause` hook.
- Source parser reference is installed in Foundry v13 modules at:
  - `/home/jon/foundryuserdata/Data/modules/black-flag-tools/black-flag-tools.mjs`
  - templates under `/home/jon/foundryuserdata/Data/modules/black-flag-tools/templates/`
  - localization at `/home/jon/foundryuserdata/Data/modules/black-flag-tools/lang/en.json`
- Relevant `black-flag-tools` reference locations:
  - `Parser` class starts around `black-flag-tools.mjs:526`.
  - Existing parse functions: `parseEnchantment` `:981`, `parseArmorWeapon` `:1058`, `parseMagicItem` `:1124`, `parseSpell` `:1179`, `parseInput` `:1242`.
  - `ParsingApplication` starts around `:1265`.
  - Parser type registry starts around `:1303`.
  - Save flow uses `cls.create({ ...this.document.toObject(), folder }, { pack: this.pack.metadata.id })` at `:1491-1498`.
  - Sidebar injection is `ParsingApplication.injectSidebarButton(app, html)` at `:1518-1531`.
  - `black-flag-tools` registers parser hook in Black Flag worlds at `:4203-4222`.
- QMD evidence:
  - `black-flag-item-types.md`: valid Black Flag item types include `background`, `heritage`, `lineage`, `talent`, and `feature`.
  - `pdf-content-import.md`: lineages are `type: "lineage"`; lineage traits are separate `type: "feature"` items referenced by `@Embed`; heritages/backgrounds can store traits directly in description HTML; background items are `type: "background"`.
  - `v13-item-creation-pitfalls.md`: `pack.createDocument(data)` is broken in Foundry v13; prefer `Item.createDocuments([data], { pack })` when exact UUIDs matter. If creating multiple docs, do not rely on returned order.
- User steering during planning: add a `CLAUDE.md` file for this repo.
- Jon confirmed refinement decisions: zero BFT runtime dependency; both parser settings default on; BFT suppression is DOM/button-only; keep spells/magic items; add lineage/heritage/background/talent; lineage traits become related feature items with embeds; v1 creates valid readable items with excellent text cleanup, not full game-functional advancements; support messy PDF paste; reuse BFT UI style; validate against `Parser Test Items` in `module-test-black-flag`.

## Confirmed Decisions From Jon

1. **Zero runtime dependency:** `black-flag-enhancements` must run on its own. It may use `black-flag-tools` as a development reference only; shipped BFE code must not import, require, or depend on `black-flag-tools`.
2. **License posture:** Upstream reference is `https://github.com/koboldpress/black-flag-tools` and currently has no `LICENSE` file. Treat copied code as legally risky. Prefer a clean-room/behavioral reimplementation where practical; if small snippets are adapted, add explicit attribution comments and README credit, but do not wholesale copy large source blocks without further approval.
3. **Default settings:** BFE parser defaults **on**. “Hide Black Flag Tools parser” defaults **on**.
4. **BFT suppression scope:** Use Option A only — remove/suppress the visible `black-flag-tools` parser button in compendium headers. Do not attempt to remove hooks or disable other BFT features.
5. **Supported parser scope:** Keep existing spells and magic-items parser functionality and add lineages, heritages, backgrounds, and talents.
6. **Lineage trait handling:** Implement the better version: create lineage trait `feature` items in the same pack and reference them with real `@Embed` links from the lineage item.
7. **Functional scope:** Create proper valid item documents and excellent cleaned text. Do not attempt full game-functional automation/advancements in v1; Jon will do manual game-functional passes.
8. **Input format:** Must support messy PDF-pasted text, not only pristine Kobold/Black Flag formatting. Text cleanup is a first-class requirement.
9. **Destination behavior:** Parser button saves to the target unlocked Item compendium. Related lineage feature items go into the same pack.
10. **UI expectation:** Reuse the Black Flag Tools parser UI style; there is no separate BFE brand.
11. **Build system:** Use the maintainable source/build/test shape that is best for the project.
12. **Runtime validation target:** Jon created a world compendium named `Parser Test Items` in the `module-test-black-flag` world. Use it for smoke testing.


## Functional Parity Requirement

Jon clarified that reimplementation is acceptable only if the delivered parser is functional. Treat the installed `black-flag-tools` parser as the behavioral oracle for existing spell and magic-item behavior. The implementation must not ship on “clean-room purity” alone; it must prove functional parity where BFT already works and prove the new concept/talent types with real Foundry creation.

Required verification before final handoff:

1. **Behavior parity tests:** Build representative spell and magic-item fixtures from BFT-supported formats, run them through BFE parser, and compare key generated item fields against the BFT parser behavior observed in the live installed module or extracted reference behavior.
2. **Runtime smoke in Foundry:** Use `Parser Test Items` in `module-test-black-flag` to create real spell, magic item, lineage, heritage, background, talent, and lineage feature documents. Inspect stored `.toObject()` results.
3. **No false success:** Do not report completion unless the parser actually creates valid Foundry documents through the same UI/save path a user will use. Static tests alone are insufficient.
4. **If parity conflicts with clean reimplementation:** Prefer functional behavior. Re-read the BFT reference and implement the behavior, with attribution, while avoiding unnecessary wholesale copying.

## Proposed File Structure

Create a conventional source tree and build artifacts:

```text
black-flag-enhancements/
├── CLAUDE.md
├── package.json
├── vitest.config.mjs                  # if Vitest chosen
├── src/
│   ├── module.js                      # init/setup orchestration
│   ├── constants.js                   # MODULE_ID, setting keys
│   ├── settings.js                    # all game.settings.register calls
│   ├── paused-overlay.js              # existing pause overlay behavior
│   └── parser/
│       ├── parser.js                  # ported low-level Parser utility
│       ├── parse-input.js             # parseInput dispatch and item parsers
│       ├── concept-parsers.js         # lineage/heritage/background/talent parsers
│       ├── parsing-application.js     # ApplicationV2 parser window + compendium button
│       ├── black-flag-tools-interop.js# suppression of BFT parser button/hook
│       └── html.js                    # small formatting helpers
├── templates/
│   └── parser/
│       ├── input.hbs
│       ├── output.hbs
│       ├── footer.hbs
│       └── types/
│           ├── concept-output.hbs
│           ├── talent-output.hbs
│           ├── spell-output.hbs       # copied/adapted if keeping existing supported types
│           └── magic-item-output.hbs
├── lang/
│   └── en.json
├── tests/
│   ├── parser-settings.test.mjs
│   ├── parser-static-contract.test.mjs
│   └── parser-concepts.test.mjs
├── dist/
│   ├── module.js
│   └── module.css
├── module.json
└── README.md
```

If the repo should remain no-build/simple, source can still be modular in `src/` and copied/bundled by a tiny Node build script. Do not hand-edit `dist/module.js` long-term.

---

## Task 1: Add Repo Local Development Context

**Objective:** Add `CLAUDE.md` with module-specific facts, workflow, parser reference paths, and Black Flag data model reminders.

**Files:**
- Create: `CLAUDE.md`

**Step 1: Write the file**

Include:

```markdown
# Black Flag Enhancements — Foundry VTT Development Notes

## Purpose
- Quality-of-life enhancements for the Black Flag Roleplaying / Tales of the Valiant system.
- Current features: paused overlay; planned feature: configurable plain-text parser.

## Runtime Targets
- Foundry VTT v13+.
- Black Flag Roleplaying / Tales of the Valiant v2.x.
- Local repo: `/home/jon/projects/black-flag-enhancements`.
- Local installed reference parser: `/home/jon/foundryuserdata/Data/modules/black-flag-tools/black-flag-tools.mjs`.

## Build / Test Commands
- `npm install`
- `npm test`
- `npm run build`
- Foundry runtime validation via MCP `execute_script` after build.

## Architecture
- Keep source in `src/`; generated files in `dist/`.
- Entry point: `src/module.js` → `dist/module.js`.
- Parser UI uses Foundry v13 `ApplicationV2` + `HandlebarsApplicationMixin`.
- Parser buttons appear only on unlocked Item compendium packs in Black Flag worlds.

## Black Flag Parser References
- Existing parser reference: `black-flag-tools.mjs` lines ~526, ~981, ~1179, ~1265, ~1518, ~4203.
- QMD docs to load before parser data-model changes: `black-flag-item-types.md`, `pdf-content-import.md`, `v13-item-creation-pitfalls.md`, `black-flag-item-config.md`.

## System-Specific Rules
- Valid concept/talent item types: `lineage`, `heritage`, `background`, `talent`, internal trait `feature`.
- Do not create dnd5e `feat` or `race` types in Black Flag.
- Prefer `Item.createDocuments([data], { pack })` for v13 compendium creation when exact UUIDs/IDs matter.
- Verify lineage/heritage/background/talent item objects against live system objects before finalizing parsers.

## Pitfalls
- Do not let this parser and `black-flag-tools` both inject parser buttons into the same compendium header.
- Do not suppress unrelated `black-flag-tools` behavior like import/export/image counter/well-known IDs.
- Do not guess advancement structures; inspect ToV/Black Flag compendium objects.
```

**Step 2: Verify**

Run: `test -f CLAUDE.md && grep -n "black-flag-tools.mjs" CLAUDE.md`

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add module development notes"
git push
```

---

## Task 2: Establish Source Tree, Build, and Tests Without Behavior Change

**Objective:** Move existing pause overlay behavior into source modules and prove the generated `dist/module.js` preserves current behavior.

**Files:**
- Create: `package.json`
- Create: `src/constants.js`
- Create: `src/settings.js`
- Create: `src/paused-overlay.js`
- Create: `src/module.js`
- Create: `tests/pause-overlay-static.test.mjs`
- Modify: `dist/module.js` (generated)
- Modify: `.gitignore` if needed

**Step 1: Write failing static test**

Create `tests/pause-overlay-static.test.mjs` asserting generated module still contains:
- `MODULE_ID = "black-flag-enhancements"`
- setting keys `pause-overlay-enabled` and `pause-overlay-image`
- hook `renderGamePause`
- asset path `assets/black_flag_icon.webp`

Run: `npm test -- tests/pause-overlay-static.test.mjs`

Expected: FAIL until test tooling/source is created.

**Step 2: Add minimal Node project**

Use no heavy bundler unless necessary. A simple build script is enough:

```json
{
  "name": "black-flag-enhancements",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "latest",
    "esbuild": "latest"
  }
}
```

Create `scripts/build.mjs` to bundle `src/module.js` to `dist/module.js` via esbuild with `format: "esm"`, `bundle: true`, and no minification.

**Step 3: Port existing behavior into source**

Implement `src/constants.js`:

```js
export const MODULE_ID = "black-flag-enhancements";
export const SETTINGS = {
  PAUSE_OVERLAY_ENABLED: "pause-overlay-enabled",
  PAUSE_OVERLAY_IMAGE: "pause-overlay-image"
};
```

Implement `src/settings.js` with current two pause overlay settings.

Implement `src/paused-overlay.js` with current `renderGamePause` logic unchanged.

Implement `src/module.js`:

```js
import { registerSettings } from "./settings.js";
import { registerPausedOverlayHook } from "./paused-overlay.js";

Hooks.once("init", registerSettings);
registerPausedOverlayHook();
```

**Step 4: Build and test**

```bash
npm install
npm run build
npm test
```

Expected: PASS.

**Step 5: Foundry smoke**

After build, use Foundry MCP or `fvtt game script execute` to verify module loads in a Black Flag world and settings are registered:

```js
return {
  active: game.modules.get("black-flag-enhancements")?.active,
  settings: [
    game.settings.settings.has("black-flag-enhancements.pause-overlay-enabled"),
    game.settings.settings.has("black-flag-enhancements.pause-overlay-image")
  ]
};
```

**Step 6: Commit**

```bash
git add package.json package-lock.json scripts src tests dist
git commit -m "refactor: add source build for module entry"
git push
```

---

## Task 3: Add Parser Settings and Localization

**Objective:** Add settings to enable the new parser and suppress the `black-flag-tools` parser button when both modules are active.

**Files:**
- Modify: `src/constants.js`
- Modify: `src/settings.js`
- Create/Modify: `lang/en.json`
- Modify: `module.json`
- Create: `tests/parser-settings.test.mjs`
- Modify: `dist/module.js` (generated)

**Step 1: Write failing tests**

Create `tests/parser-settings.test.mjs` that reads `src/settings.js`, `src/constants.js`, `lang/en.json`, and `module.json` and asserts:

- setting key `parser-enabled` exists.
- setting key `suppress-black-flag-tools-parser` exists.
- both settings are world scope and Boolean.
- `parser-enabled` default is `true` unless Jon specifies otherwise.
- `suppress-black-flag-tools-parser` default is `true` unless Jon specifies otherwise.
- `module.json.languages` includes `lang/en.json`.

Run: `npm test -- tests/parser-settings.test.mjs`

Expected: FAIL.

**Step 2: Add constants**

```js
export const SETTINGS = {
  PAUSE_OVERLAY_ENABLED: "pause-overlay-enabled",
  PAUSE_OVERLAY_IMAGE: "pause-overlay-image",
  PARSER_ENABLED: "parser-enabled",
  SUPPRESS_BLACK_FLAG_TOOLS_PARSER: "suppress-black-flag-tools-parser"
};
```

**Step 3: Register settings**

In `registerSettings()` add:

```js
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
```

**Step 4: Add localization**

Create `lang/en.json` with `BFE.Settings.*` and parser labels.

**Step 5: Add `module.json.languages`**

```json
"languages": [
  { "lang": "en", "name": "English", "path": "lang/en.json" }
]
```

**Step 6: Build/test/commit**

```bash
npm run build
npm test
git add src lang module.json tests dist
git commit -m "feat: add parser settings"
git push
```

---

## Task 4: Port Existing Parser Utility and Existing Item Parsers

**Objective:** Copy/adapt the low-level `Parser` utility and existing parser support for spells/magic items into `black-flag-enhancements` as a working baseline.

**Files:**
- Create: `src/parser/parser.js`
- Create: `src/parser/parse-input.js`
- Create: `src/parser/html.js`
- Create: `tests/parser-existing-types.test.mjs`

**Step 1: License/attribution gate**

Upstream repo: `https://github.com/koboldpress/black-flag-tools`. Jon confirmed there is no `LICENSE` file. Because there is no explicit license grant, do **not** wholesale-copy large source blocks into BFE. Use the installed module as a behavioral/reference implementation and write BFE-owned parser code. If small implementation details are adapted, add an attribution comment and README credit, but keep the implementation independent and remove any unnecessary identical structure/text.

**Step 2: Write failing tests**

Use source/static tests first because Foundry globals are hard to fully mock:

- `Parser` exports a class.
- `parseInput(type, input)` exports a function.
- `parseInput` switch includes existing types: `spell`, `ammunition`, `armor`, `weapon`, `enchantment`, `consumable`, `container`, `gear`, `staff`.
- No imports from `black-flag-tools` runtime module.

Run: `npm test -- tests/parser-existing-types.test.mjs`

Expected: FAIL.

**Step 3: Port minimal utility**

Reimplement the `Parser` utility methods needed by existing parse functions, using BFT as a behavior reference rather than a wholesale copy:
- `remainder`
- `consumeLine`
- `consumeRegex`
- `consumeIfMatches`
- `consumeNumber`
- `consumeEnum`
- `consumeEnumPlurals`
- `consumeDescription`
- `parseEnrichers`
- `consumeAttunement`
- `consumeCost`
- `consumeCasting`
- `consumeComponents`
- `consumeDuration`
- `consumeRange`

Keep methods as close to reference as possible.

**Step 4: Reimplement existing parse functions**

Recreate BFT-compatible behavior for:
- `parseEnchantment`
- `parseArmorWeapon`
- `findBaseData`
- `parseMagicItem`
- `findType`
- `parseSpell`
- `parseInput`

Keep function names if useful for tests, but avoid copying large blocks verbatim because the upstream repository has no license file.

**Step 5: Build/test**

```bash
npm run build
npm test
```

**Step 6: Runtime smoke**

Use Foundry MCP script to import cache-busted built module and call parser exports if exported for testing, or directly instantiate parser app after Task 6. At this stage, static tests are acceptable baseline if parser UI is not wired yet.

**Step 7: Commit**

```bash
git add src/parser tests dist
git commit -m "feat: port base Black Flag parser"
git push
```

---

## Task 5: Add Concept/Talent Parser Data Model Support

**Objective:** Extend `parseInput` to create clean `lineage`, `heritage`, `background`, and `talent` Item documents from messy PDF-pasted text, plus related lineage trait `feature` documents for real `@Embed` links.

**Files:**
- Create: `src/parser/concept-parsers.js`
- Modify: `src/parser/parse-input.js`
- Create: `tests/parser-concepts.test.mjs`

**Step 1: Inspect live reference item objects**

Before implementing, use Foundry MCP `execute_script` to inspect exemplar `lineage`, `heritage`, `background`, and `talent` items from installed system/packs. Example script shape:

```js
const packs = ["black-flag.lineages", "black-flag.heritages", "black-flag.backgrounds", "black-flag.talents"];
const out = {};
for (const id of packs) {
  const pack = game.packs.get(id);
  const index = await pack.getIndex({ fields: ["type"] });
  const entry = index.find(e => ["lineage", "heritage", "background", "talent"].includes(e.type));
  const doc = entry ? await pack.getDocument(entry._id) : null;
  out[id] = doc?.toObject();
}
return out;
```

Save the inspected shapes into test fixtures or comments only if they contain no copyrighted long text. Use field structure, not full content.

**Step 2: Write failing tests**

Create tests that import pure helper functions and assert generated objects for sample text:

Lineage input:

```text
Dhampir
Lineage Traits
Age. You age normally.
Size. Your size is Medium or Small.
Speed. Your base walking speed is 30 feet.
Darkvision. You have darkvision to 60 feet.
Bite. Your fanged bite is a natural weapon.
```

Expected:
- returned main document type `lineage`, name `Dhampir`.
- description contains `<h5>Lineage Traits</h5>`.
- trait feature documents are returned or represented for `Darkvision` and `Bite` if implementing feature split.
- no invalid `race`/`feat` types.

Heritage input:

```text
Aerobat
You are at home in high places.
Descender. You can slow your fall.
Languages. You know Common and one other language.
```

Expected: type `heritage`, description contains emphasized trait names.

Background input:

```text
Vampire Hunter
You hunt creatures of the night.
Skill Proficiencies: Choose two from Investigation, Religion, or Survival.
Equipment: A wooden stake, holy symbol, and traveler's clothes.
Talent: Choose one martial talent.
Adventuring Motivation
1 You seek revenge.
```

Expected: type `background`, description preserves skill/equipment/talent/motivation sections.

Talent input:

```text
Alert
Martial Talent
You are always ready for danger.
Prerequisite: None
Benefit. You gain a +5 bonus to initiative.
```

Expected: type `talent`, `system.type.category` or equivalent category field matches live-inspected shape for Martial if supported; description contains prerequisite/benefit.

Run: `npm test -- tests/parser-concepts.test.mjs`

Expected: FAIL.

**Step 3: Implement simple robust parsers**

Implement helpers:

```js
export function parseLineage(input) { ... }
export function parseHeritage(input) { ... }
export function parseBackground(input) { ... }
export function parseTalent(input) { ... }
```

Initial implementation should:
- consume first credible title line as item name, tolerating page headers/footers and blank lines from PDF paste.
- normalize descriptions into clean HTML paragraphs with collapsed whitespace, dehyphenated line wraps where safe, bullet/list cleanup, and removal of obvious page-number/header/footer noise.
- detect `Heading. Text` blocks and render `<p><em><strong>Heading.</strong></em> Text</p>`.
- for lineage, detect the `Lineage Traits` marker and create trait `feature` items plus `@Embed` references. Inline-only lineage traits are not acceptable for the target implementation unless Jon explicitly downscopes later.

**Lineage target:** generate a parse result object that can include multiple documents:

```js
{
  primary: ItemDocumentOrData,
  related: [featureItemData]
}
```

Then Task 6 save flow handles creating related features first, mapping feature names to UUIDs, and filling `@Embed[...]` links.

**Step 4: Extend `parseInput`**

Add cases:

```js
case "lineage": return parseLineage(input);
case "heritage": return parseHeritage(input);
case "background": return parseBackground(input);
case "talent": return parseTalent(input);
```

**Step 5: Verify no data-model guessing remains**

Compare generated minimal data against live-inspected system defaults. For each new type, ensure required fields are either set correctly or omitted so Foundry `Item.implementation` defaults fill them.

**Step 6: Build/test/commit**

```bash
npm run build
npm test
git add src/parser tests dist
git commit -m "feat: parse Black Flag concepts and talents"
git push
```

---

## Task 6: Add Parser Application, Templates, and Sidebar Button

**Objective:** Add the parser UI in `black-flag-enhancements`, controlled by the new setting, with type choices for existing and new parser types.

**Files:**
- Create: `src/parser/parsing-application.js`
- Create: `templates/parser/input.hbs`
- Create: `templates/parser/output.hbs`
- Create: `templates/parser/footer.hbs`
- Create: `templates/parser/types/concept-output.hbs`
- Create: `templates/parser/types/talent-output.hbs`
- Create or copy/adapt: `templates/parser/types/spell-output.hbs`
- Create or copy/adapt: `templates/parser/types/magic-item-output.hbs`
- Modify: `src/module.js`
- Modify: `src/parser/parse-input.js`
- Create: `tests/parser-static-contract.test.mjs`
- Modify: `dist/module.js` (generated)

**Step 1: Write failing static contract tests**

Assert:
- `ParsingApplication` extends `HandlebarsApplicationMixin(ApplicationV2)`.
- `DEFAULT_OPTIONS.classes` includes `black-flag-enhancements` and `parser`.
- `PARTS` points to `modules/black-flag-enhancements/templates/parser/...`.
- `TYPES` includes `lineage`, `heritage`, `background`, `talent`, `spell`, and magic item types.
- `injectSidebarButton` checks `metadata.type === "Item"`, `!locked`, parser-enabled setting, and Black Flag system.
- Button class/data-action is project-specific, e.g. `bfe-parse` / `data-action="bfe-parse"`, not generic `.parse` only.

Run: `npm test -- tests/parser-static-contract.test.mjs`

Expected: FAIL.

**Step 2: Implement application**

Adapt the reference `ParsingApplication` but change:
- module ID and CSS classes.
- settings access to `black-flag-enhancements.parser-enabled`.
- templates path to this module.
- flags for last type/folder under `black-flag-enhancements`.
- save flow to use `Item.createDocuments([data], { pack })` where needed.
- result shape to support `primary` + `related` from lineage parser.

**Step 3: Implement safe save flow**

Recommended save algorithm:

1. Parse input into either an `Item` instance or `{ primary, related }` data.
2. For normal single items:
   ```js
   const [created] = await Item.createDocuments([{ ...data, folder }], { pack: this.pack.metadata.id });
   ```
3. For lineage with related features:
   - Create each feature individually with `Item.createDocuments([featureData], { pack })`.
   - Build feature UUID map by `created.name`.
   - Replace placeholder embed tokens in lineage description with actual `@Embed[${uuid} inline]{Name}`.
   - Create lineage document last.
4. Render created primary sheet.

**Step 4: Add templates**

Keep templates simple and single-root where ApplicationV2 requires it:

- `input.hbs`: textarea for `input`.
- `output.hbs`: preview/error container.
- `footer.hbs`: type select, folder select, save button.
- `concept-output.hbs`: show name/type/description and related features if present.
- `talent-output.hbs`: show name/category/description.

**Step 5: Wire hook**

In `src/module.js`:

```js
import { registerParserHooks } from "./parser/parsing-application.js";

Hooks.once("setup", () => {
  if (game.system.id === "black-flag") registerParserHooks();
});
```

**Step 6: Build/test/commit**

```bash
npm run build
npm test
git add src templates tests dist
git commit -m "feat: add parser application UI"
git push
```

---

## Task 7: Suppress `black-flag-tools` Parser Button Without Breaking Other Tools

**Objective:** When configured, prevent the `black-flag-tools` parser from competing with the new parser while preserving all other `black-flag-tools` features.

**Files:**
- Create: `src/parser/black-flag-tools-interop.js`
- Modify: `src/module.js`
- Create: `tests/black-flag-tools-interop.test.mjs`
- Modify: `dist/module.js` (generated)

**Step 1: Implement approved suppression point

The reference module registers:

```js
Hooks.on("renderCompendium", (app, html, data) => ParsingApplication.injectSidebarButton(app, html));
```

Jon approved Option A only. Do not try to remove BFT hooks. Use defensive DOM-level suppression after render:

- If setting disabled, do nothing.
- If `black-flag-tools` inactive, do nothing.
- On `renderCompendium`, remove any header button matching the BFT parser signature:
  - `button.parse[data-action="parse"]`
  - text includes localized `BFTools.Parser.Title` or `Parse Document`
  - only inside `.header-actions`
- Do not remove BFE button (`.bfe-parse`).

**Step 2: Write failing test**

Test function `removeBlackFlagToolsParserButton(root, { enabled, bftActive, bftTitle })` against a small DOM fixture:

- removes BFT button when suppression enabled.
- does not remove BFE button.
- does not remove unrelated buttons.
- no-op when suppression disabled.

Use `happy-dom` or simple string/regex tests if avoiding DOM dependency.

**Step 3: Implement interop helper**

```js
export function registerBlackFlagToolsInterop() {
  Hooks.on("renderCompendium", (app, html) => {
    if (!game.settings.get(MODULE_ID, SETTINGS.SUPPRESS_BLACK_FLAG_TOOLS_PARSER)) return;
    if (!game.modules.get("black-flag-tools")?.active) return;
    removeBlackFlagToolsParserButton(html instanceof HTMLElement ? html : html[0], {
      enabled: true,
      bftActive: true,
      bftTitle: game.i18n.localize("BFTools.Parser.Title")
    });
  });
}
```

If render order means BFE runs before BFT and removal misses, use a short `queueMicrotask()` / `setTimeout(..., 0)` inside the hook, then test the actual Foundry render.

**Step 4: Wire only in Black Flag worlds**

Call from setup hook after parser hook registration.

**Step 5: Build/test/commit**

```bash
npm run build
npm test
git add src/parser tests dist
git commit -m "feat: suppress competing Black Flag Tools parser"
git push
```

---

## Task 8: Runtime Foundry Validation of Parser Creation

**Objective:** Prove the parser creates real Black Flag compendium items for lineage, heritage, background, and talent in Foundry v13.

**Files:**
- Create: `scripts/foundry-smoke-parser.mjs` or `scripts/foundry-smoke-parser.js`
- Modify: `CLAUDE.md` with smoke command if useful

**Step 1: Write smoke script**

Create a repeatable script that can be passed to Foundry MCP `execute_script` or `fvtt game script execute`. It should:

1. Verify the active world is `module-test-black-flag` or explicitly report the active world if not.
2. Verify `game.system.id === "black-flag"`.
2. Verify `black-flag-enhancements` active.
3. Import built parser module with a cache-busting URL if exports are available:
   ```js
   const mod = await import(`/modules/black-flag-enhancements/dist/module.js?smoke=${Date.now()}`);
   ```
   If parser exports are not available from bundle, expose a test-only namespace:
   ```js
   globalThis.BlackFlagEnhancements = { parseInput, ParsingApplication };
   ```
4. Use the world compendium named `Parser Test Items` that Jon created in `module-test-black-flag`. If not found, stop and report the active world and available unlocked Item packs; do not silently create a different destination.
5. Parse messy PDF-paste sample text for all four new types.
6. Create documents with the same save path used by the app.
7. Inspect `.toObject()` for created docs, including related lineage feature items and `@Embed` references.
8. Delete temporary docs only if the smoke uses synthetic names with a unique sentinel prefix; otherwise leave user-created packs alone.
9. Return structured JSON:
   ```js
   return { lineage: { ok: true, type: "lineage" }, ... };
   ```

**Step 2: Run smoke**

Run build first:

```bash
npm run build
npm test
```

Then execute in Foundry through MCP or CLI. Record actual output in final report.

**Step 3: Fix all same-class runtime issues before asking Jon to test**

If lineage fails due to missing required fields, inspect the live created/stored object and patch all concept parsers together. Do not fix one type at a time and bounce to the user.

**Step 4: Commit**

```bash
git add scripts CLAUDE.md src tests dist
git commit -m "test: add parser Foundry smoke validation"
git push
```

---

## Task 9: Documentation and Settings UI Update

**Objective:** Document the parser feature, settings, conflicts with `black-flag-tools`, and supported content types.

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md` if smoke/build instructions changed
- Create/Modify: `tests/readme-contract.test.mjs`

**Step 1: Write failing README contract test**

Assert README mentions:
- parser feature.
- supported parser item types: spells, magic items, lineage, heritage, background, talent.
- setting to enable/disable BFE parser.
- setting to suppress `black-flag-tools` parser.
- Black Flag Tools attribution if code was ported.

**Step 2: Update README**

Add a feature row:

```markdown
| **Content Parser** | Adds a configurable plain-text parser for Black Flag items, including spells, magic items, lineages, heritages, backgrounds, and talents. |
```

Add settings table entries:

```markdown
| Enable Content Parser | Boolean | On | Shows the Black Flag Enhancements parser button on unlocked Item compendiums. |
| Hide Black Flag Tools Parser | Boolean | On | Removes the Black Flag Tools parser button when both modules are active so only one parser appears. |
```

Add notes:
- This does not disable other `black-flag-tools` features.
- Supported text format follows standard Black Flag-style headings.
- Lineage feature embedding behavior.

**Step 3: Build/test/commit**

```bash
npm run build
npm test
git add README.md CLAUDE.md tests dist
git commit -m "docs: document content parser settings"
git push
```

---

## Task 10: Final Verification and Review

**Objective:** Run the full verification pipeline before final handoff.

**Files:**
- No planned edits unless review finds issues.

**Step 1: Full local checks**

```bash
npm run build
npm test
git diff --check
git status --short
```

**Step 2: Static scan**

Run:

```bash
git grep -n "noisy\.humung\.us\|30000\|FOUNDRY.*PASSWORD\|API_KEY\|TOKEN\|SECRET" -- . ':!package-lock.json'
```

Expected: no leaked secrets/private Foundry endpoints.

**Step 3: Runtime smoke**

Run the Foundry smoke from Task 8 and capture output. Required result:
- parser settings registered.
- BFE parser button present when enabled.
- BFT parser button absent when suppression enabled and BFT active.
- lineage/heritage/background/talent docs created successfully and have expected `type` values.

**Step 4: Independent code review**

Use requesting-code-review flow or delegate a reviewer with diff + test output. Blocking issues must be fixed and re-reviewed.

**Step 5: Final commit if needed**

If review fixes were made:

```bash
git add -A
git commit -m "fix: address parser review findings"
git push
```

**Step 6: Final report**

Report:
- commits pushed.
- tests run and outputs.
- Foundry smoke result.
- any limitations / unsupported text formats.

---

## Risks / Tradeoffs / Open Questions

- **License/attribution:** The parser source is from `koboldpress/black-flag-tools`, whose GitHub repo currently has no `LICENSE` file. Treat the reference as behavior/documentation, not freely copyable code. Reimplement independently where practical and add attribution for any adapted ideas.
- **Suppressing BFT parser:** The safest suppression may be DOM-level removal because BFT registers an anonymous hook. This is less elegant than direct hook removal but avoids patching third-party internals.
- **Lineage traits:** QMD says lineage traits should be separate `feature` items referenced via `@Embed`, and Jon confirmed this is required. This requires multi-document save flow and exact UUID mapping.
- **Advancements:** Backgrounds/talents/lineages may have advancement data in official packs, but v1 should create valid readable items and excellent cleaned text only. Jon will do manual game-functional passes. Do not guess advancements.
- **Build conversion:** Introducing package/build tooling is a repo shape change. It is justified because the parser is large enough that maintaining hand-written `dist/module.js` is unsafe.
- **Messy PDF paste:** This is not a nice-to-have. Parser tests need dirty fixtures with page breaks, weird line wraps, bullets, repeated headers/footers, and extra whitespace.
- **Runtime validation:** Static Node tests cannot prove Black Flag DataModel validity. Foundry MCP smoke against `Parser Test Items` in `module-test-black-flag` is mandatory before calling this done.

## Suggested Execution Mode

Use `subagent-driven-development` task-by-task. Do not dispatch multiple implementers touching the same files concurrently. After each task, verify commit + push before continuing.
