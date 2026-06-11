import { MODULE_ID, SETTINGS, TOV_MODULE_ID } from "./constants.js";

export function registerSettings() {
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
      ...(tovInstalled ? { "tov-mark": "Tales of the Valiant Mark" } : {})
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
