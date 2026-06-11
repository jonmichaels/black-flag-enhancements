# Black Flag Enhancements — Foundry VTT Development Notes

## Purpose
- Quality-of-life enhancements for the Black Flag Roleplaying / Tales of the Valiant system.
- Current features: paused overlay and configurable plain-text parser.

## Runtime Targets
- Foundry VTT v13+.
- Black Flag Roleplaying / Tales of the Valiant v2.x.
- Local repo: `/home/jon/projects/black-flag-enhancements`.
- Local installed reference parser: `/home/jon/foundryuserdata/Data/modules/black-flag-tools/black-flag-tools.mjs`.

## Build / Test Commands
- `npm install`
- `npm test`
- `npm run build`
- Foundry runtime validation via MCP `execute_script` or `fvtt game script execute` after build.

## Architecture
- Source lives in `src/`; generated files live in `dist/`.
- Entry point: `src/module.js` → `dist/module.js`.
- Parser UI uses Foundry v13 `ApplicationV2` + `HandlebarsApplicationMixin`.
- Parser buttons appear only on unlocked Item compendium packs in Black Flag worlds.

## Black Flag Parser References
- Existing parser reference: `/home/jon/foundryuserdata/Data/modules/black-flag-tools/black-flag-tools.mjs` lines ~526, ~981, ~1179, ~1265, ~1518, ~4203.
- QMD docs to load before parser data-model changes: `black-flag-item-types.md`, `pdf-content-import.md`, `v13-item-creation-pitfalls.md`, `black-flag-item-config.md`.

## System-Specific Rules
- Valid concept/talent item types: `lineage`, `heritage`, `background`, `talent`, internal trait `feature`.
- Do not create dnd5e `feat` or `race` types in Black Flag.
- Prefer `Item.createDocuments([data], { pack })` for v13 compendium creation when exact UUIDs/IDs matter.
- Verify lineage/heritage/background/talent item objects against live system objects before finalizing parsers.

## Pitfalls
- Do not let this parser and `black-flag-tools` both inject parser buttons into the same compendium header.
- Do not suppress unrelated `black-flag-tools` behavior like import/export/image counter/well-known IDs.
- Do not guess advancement structures; readable valid items only for parser v1.
- Build before Foundry testing.
