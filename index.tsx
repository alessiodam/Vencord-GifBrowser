/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { IconComponent } from "@utils/types";
import { closeModal, openModal, SelectedChannelStore } from "@webpack/common";

import { startRecent } from "./api";
import { GifBrowser } from "./GifBrowser";
import { settings } from "./settings";
import { cl } from "./utils";

let modalKey: string | null = null;

export function openGifBrowser(channelId: string) {
    if (modalKey) return;

    modalKey = openModal(
        props => (
            <div className={cl("modal")} role="dialog" aria-label="GIF Browser">
                <ErrorBoundary>
                    <GifBrowser channelId={channelId} onClose={props.onClose} />
                </ErrorBoundary>
            </div>
        ),
        { onCloseCallback: () => modalKey = null }
    );
}

function matchesKeybind(e: KeyboardEvent, keybind: string) {
    const parts = keybind.toLowerCase().split("+").map(p => p.trim()).filter(Boolean);
    if (!parts.length) return false;

    const key = parts.pop()!;
    const mods = new Set(parts);

    return e.key.toLowerCase() === key
        && e.ctrlKey === (mods.has("ctrl") || mods.has("control"))
        && e.metaKey === (mods.has("cmd") || mods.has("meta") || mods.has("super"))
        && e.shiftKey === mods.has("shift")
        && e.altKey === mods.has("alt");
}

function onGlobalKeyDown(e: KeyboardEvent) {
    if (e.repeat || !matchesKeybind(e, settings.store.keybind)) return;

    e.preventDefault();
    e.stopPropagation();

    if (modalKey) {
        closeModal(modalKey);
        return;
    }

    const channelId = SelectedChannelStore.getChannelId();
    if (channelId) openGifBrowser(channelId);
}

const GifBrowserIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className}>
        <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" />
        <circle cx="16.5" cy="16.5" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m18.8 18.8 2.4 2.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

const GifBrowserButton: ChatBarButtonFactory = ({ isAnyChat, channel, type }) => {
    const { chatBarButton } = settings.use(["chatBarButton"]);
    if (!chatBarButton || !isAnyChat || !type.gifs?.allowSending) return null;

    return (
        <ChatBarButton tooltip="GIF Browser" onClick={() => openGifBrowser(channel.id)}>
            <GifBrowserIcon />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "GifBrowser",
    description: "A big, keyboard-driven GIF browser: favorites, recently sent and Klipy search, with GifTags support",
    authors: [{ name: "alessio", id: 0n }],
    settings,

    patches: [
        {
            find: "expression-picker-last-active-view",
            replacement: {
                match: /(function \i\((\i),(\i),(\i)\)\{)(?=let (\i)=\i\.getState\(\);\5\.activeView===\2&&\5\.activeViewType===\3&&)/,
                replace: "$1if($self.interceptPicker($2,$3,$4))return;"
            }
        }
    ],

    chatBarButton: {
        icon: GifBrowserIcon,
        render: GifBrowserButton
    },

    interceptPicker(view: string, _chatInputType: unknown, channelId?: string) {
        if (view !== "gif" || !settings.store.replaceGifPicker || !channelId) return false;

        openGifBrowser(channelId);
        return true;
    },

    start() {
        startRecent();
        document.addEventListener("keydown", onGlobalKeyDown, true);
    },

    stop() {
        document.removeEventListener("keydown", onGlobalKeyDown, true);
    }
});
