/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import type { Gif } from "./api";

export type View = "favorites" | "recent" | "klipy";

export const settings = definePluginSettings({
    chatBarButton: {
        type: OptionType.BOOLEAN,
        description: "Show a button in the chat bar that opens the GIF browser",
        default: true
    },
    replaceGifPicker: {
        type: OptionType.BOOLEAN,
        description: "Open the GIF browser instead of Discord's GIF picker (GIF button and Ctrl+G)",
        default: false
    },
    keybind: {
        type: OptionType.STRING,
        description: "Keyboard shortcut that opens the GIF browser, e.g. Ctrl+Shift+G. Leave empty to disable",
        default: "Ctrl+Shift+G"
    },
    defaultView: {
        type: OptionType.SELECT,
        description: "What the GIF browser shows when opened",
        options: [
            { label: "Favorites", value: "favorites", default: true },
            { label: "Recently sent", value: "recent" },
            { label: "Klipy (trending & search)", value: "klipy" }
        ]
    },
    closeOnSend: {
        type: OptionType.BOOLEAN,
        description: "Close the GIF browser after sending a GIF (Ctrl+click / Ctrl+Enter always keeps it open)",
        default: true
    },
    tileSize: {
        type: OptionType.SLIDER,
        description: "Size of the GIF tiles (also adjustable inside the GIF browser)",
        markers: [100, 150, 200, 250, 300],
        stickToMarkers: false,
        default: 180
    },
    recent: {
        type: OptionType.CUSTOM,
        default: [] as Gif[]
    }
});
