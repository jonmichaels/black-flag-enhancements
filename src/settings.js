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
