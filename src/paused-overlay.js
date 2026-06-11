import { MODULE_ID, SETTINGS, TOV_MODULE_ID } from "./constants.js";

export function registerPausedOverlayHook() {
  Hooks.on("renderGamePause", (_app, html) => {
    if (!game.settings.get(MODULE_ID, SETTINGS.PAUSE_OVERLAY_ENABLED)) return;

    const ourHooks = Hooks.events.renderGamePause.filter(
      h => h.toString().includes(MODULE_ID)
    );
    if (Hooks.events.renderGamePause.length > (ourHooks.length + 1)) return;

    const tovInstalled = game.modules.get(TOV_MODULE_ID)?.active ?? false;
    const imageChoice = game.settings.get(MODULE_ID, SETTINGS.PAUSE_OVERLAY_IMAGE);
    const imgSrc = (imageChoice === "tov-mark" && tovInstalled)
      ? "modules/kp-tov-players-guide/assets/furniture/ToV-Mark.webp"
      : `modules/${MODULE_ID}/assets/black_flag_icon.webp`;

    html.classList.add("bfe-pause");

    const container = document.createElement("div");
    container.className = "flexcol bfe-pause-container";
    container.append(...html.children);
    html.append(container);

    const img = html.querySelector("img");
    if (img) {
      img.src = imgSrc;
      img.className = imageChoice === "tov-mark" && tovInstalled
        ? "bfe-pause-img bfe-pause-img-tov"
        : "bfe-pause-img";
    }
  });
}
