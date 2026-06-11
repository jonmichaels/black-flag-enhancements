import { registerSettings } from "./settings.js";
import { registerPausedOverlayHook } from "./paused-overlay.js";
import { registerParserHooks, ParsingApplication } from "./parser/parsing-application.js";
import { registerBlackFlagToolsInterop } from "./parser/black-flag-tools-interop.js";
import { parseInput } from "./parser/parse-input.js";

Hooks.once("init", registerSettings);
registerPausedOverlayHook();

Hooks.once("setup", () => {
  if (game.system.id !== "black-flag") return;
  registerParserHooks();
  registerBlackFlagToolsInterop();
  globalThis.BlackFlagEnhancements = { parseInput, ParsingApplication };
});

export { parseInput, ParsingApplication };
