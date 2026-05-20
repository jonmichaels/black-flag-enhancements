// ─── Black Flag Enhancements ───
const MODULE_ID = "black-flag-enhancements";
let tovInstalled = false;  // set during init when game is available

// ─── Register settings ───
Hooks.once("init", () => {
    tovInstalled = game.modules.get("kp-tov-players-guide")?.active ?? false;

    // Pause overlay: enable/disable
    game.settings.register(MODULE_ID, "pause-overlay-enabled", {
        name: "Game Paused Overlay",
        hint: "Replace the default Foundry paused overlay with a Black Flag / ToV themed version.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    // Pause overlay: image choice
    game.settings.register(MODULE_ID, "pause-overlay-image", {
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
});

// ─── Pause overlay patch ───
Hooks.on("renderGamePause", (app, html) => {
    if (!game.settings.get(MODULE_ID, "pause-overlay-enabled")) return;

    // Skip if another module/system already modified the overlay
    const ourHooks = Hooks.events.renderGamePause.filter(
        h => h.toString().includes(MODULE_ID)
    );
    if (Hooks.events.renderGamePause.length > (ourHooks.length + 1)) return;

    // Determine image source
    const imageChoice = game.settings.get(MODULE_ID, "pause-overlay-image");
    const imgSrc = (imageChoice === "tov-mark" && tovInstalled)
        ? "modules/kp-tov-players-guide/assets/furniture/ToV-Mark.webp"
        : `modules/${MODULE_ID}/black_flag_icon.webp`;

    // Add our CSS class to the figure
    html.classList.add("bfe-pause");

    // Restructure DOM (matches dnd5e pattern)
    const container = document.createElement("div");
    container.className = "flexcol bfe-pause-container";
    container.append(...html.children);
    html.append(container);

    // Replace clock icon with our image
    const img = html.querySelector("img");
    if (img) {
        img.src = imgSrc;
        img.className = "bfe-pause-img";
    }
});
