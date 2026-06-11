import { BFT_MODULE_ID, MODULE_ID, SETTINGS } from "../constants.js";

export function removeBlackFlagToolsParserButton(root, { enabled = true, bftActive = true, bftTitle = "Parse Document" } = {}) {
  if (!enabled || !bftActive || !root?.querySelectorAll) return 0;
  let removed = 0;
  const title = String(bftTitle || "Parse Document").trim();
  for (const button of root.querySelectorAll('.header-actions button.parse[data-action="parse"]')) {
    if (button.classList.contains("bfe-parse")) continue;
    const text = button.textContent?.trim() || button.getAttribute("title") || button.getAttribute("aria-label") || "";
    if (text.includes(title) || text.includes("Parse Document")) { button.remove(); removed += 1; }
  }
  return removed;
}

export function registerBlackFlagToolsInterop() {
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
