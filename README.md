# Black Flag Enhancements

> **⚠️ Disclaimer:** This module was created by an AI coding agent (Hephaestus, via Hermes Agent) under the direction of Jon Michaels. While tested and functional, users should verify behavior in their own games before relying on it in critical sessions.

[![Foundry VTT](https://img.shields.io/badge/Foundry-v13-orange)](https://foundryvtt.com)
[![Black Flag](https://img.shields.io/badge/System-Black%20Flag%20%2F%20ToV-blue)](https://github.com/koboldpress/black-flag)
[![Version](https://img.shields.io/badge/Version-0.1.0-green)](https://github.com/jonmichaels/black-flag-enhancements/releases)

A collection of quality-of-life tweaks and UI enhancements for **Black Flag Roleplaying (Tales of the Valiant)** in Foundry VTT. Each enhancement can be toggled on or off independently via the module settings.

## Features

| Enhancement | Description |
|-------------|-------------|
| **Paused Overlay** | Replaces the default Foundry "Game Paused" clock icon with a Black Flag or ToV themed image with a slow pulse animation. Supports the Black Flag icon (included) and the Tales of the Valiant mark from the Kobold Press ToV Player's Guide module (optional). |

## Installation

**In Foundry VTT:**
1. Go to **Add-on Modules** → **Install Module**
2. Paste the manifest URL: `https://github.com/jonmichaels/black-flag-enhancements/releases/latest/download/module.json`
3. Click **Install**

## Requirements

- **Foundry VTT** v13+
- **Black Flag Roleplaying** (Tales of the Valiant) v2.0+
- **Kobold Press ToV Player's Guide** module (optional — enables the Tales of the Valiant mark image option)

## Settings

All settings are under **Configure Settings** → **Black Flag Enhancements**.

### Game Paused Overlay

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable | Boolean | On | Toggle the paused overlay replacement |
| Image | Dropdown | Black Flag Icon | Choose between the Black Flag icon and Tales of the Valiant mark (if ToV module is installed) |

## How It Works

### Game Paused Overlay

When the game is paused, the default Foundry clock icon is replaced with a themed image that slowly pulses with a backlight. Inspired by the same feature in the D&D 5E system.

- **Black Flag Icon**: The green and gold Black Flag emblem (included, 145px height)
- **Tales of the Valiant Mark**: The white ToV infinity mark on black circular background, sourced from the Kobold Press ToV Player's Guide module (170px height, only selectable when that module is active)

## Credits

- **D&D 5E system** — reference for the pause overlay rendering pattern (`renderGamePause` hook + CSS pulsate)
- **Kobold Press ToV Player's Guide module** — source of the optional Tales of the Valiant mark image
- **This module** — by Jon Michaels, coded by Hephaestus (AI agent via Hermes Agent)

## License

MIT
