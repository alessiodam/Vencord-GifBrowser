/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { SettingsStore } from "@api/Settings";
import { insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, MessageActions, PendingReplyStore, React, RestAPI, UserSettingsProtoStore } from "@webpack/common";

import { settings } from "./settings";

export interface Gif {
    url: string;
    src: string;
    width: number;
    height: number;
    id?: string;
    gifSrc?: string;
}

export interface Category {
    name: string;
    src: string;
}

interface RawGif {
    id: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
}

interface FavoriteGif {
    src: string;
    width: number;
    height: number;
    order: number;
}

const enum GifFormat {
    IMAGE = 1,
    VIDEO = 2
}

const GifPickerViewStore = findStoreLazy("GIFPickerViewStore");
const FavoriteGifActions = mapMangledModuleLazy('type:"GIF_PICKER_INITIALIZE"', {
    addFavoriteGif: filters.byCode(".GIF_FAVORITED,"),
    removeFavoriteGif: filters.byCode(".GIF_UNFAVORITED,")
});

export const isVideo = (src: string) => /\.(mp4|webm)(\?|$)/i.test(src);
const withProtocol = (url: string) => url.startsWith("//") ? `https:${url}` : url;

const locale = () => document.documentElement.lang || navigator.language || "en-US";
const mediaFormat = () => GifPickerViewStore.getSelectedFormat?.() ?? "webm";

const toGif = (gif: RawGif): Gif => ({
    id: gif.id,
    url: gif.url,
    src: withProtocol(gif.src),
    gifSrc: gif.gif_src && withProtocol(gif.gif_src),
    width: gif.width,
    height: gif.height
});

export async function searchGifs(query: string, limit: number) {
    const { body } = await RestAPI.get({
        url: "/gifs/search",
        query: { q: query, media_format: mediaFormat(), locale: locale(), limit }
    });
    return (body as RawGif[]).map(toGif);
}

export async function trendingGifs(limit: number) {
    const { body } = await RestAPI.get({
        url: "/gifs/trending-gifs",
        query: { media_format: mediaFormat(), locale: locale(), limit }
    });
    return (body as RawGif[]).map(toGif);
}

export async function trendingCategories(): Promise<Category[]> {
    const { body } = await RestAPI.get({
        url: "/gifs/trending",
        query: { media_format: mediaFormat(), locale: locale() }
    });
    return (body.categories as Category[]).map(c => ({ name: c.name, src: withProtocol(c.src) }));
}

export async function searchSuggestions(query: string): Promise<string[]> {
    const { body } = await RestAPI.get({
        url: "/gifs/suggest",
        query: { q: query, limit: 5, locale: locale() }
    });
    return body;
}

function registerShare(gif: Gif, query: string) {
    if (!gif.id) return;
    RestAPI.post({ url: "/gifs/select", body: { id: gif.id, q: query } }).catch(() => { });
}

export function getFavoritesMap(): Record<string, FavoriteGif> {
    return (UserSettingsProtoStore.frecencyWithoutFetchingLatest as any)?.favoriteGifs?.gifs ?? {};
}

export function favoritesToList(favorites: Record<string, FavoriteGif>): Gif[] {
    return Object.entries(favorites)
        .sort(([, a], [, b]) => b.order - a.order)
        .map(([url, gif]) => ({ url, src: withProtocol(gif.src), width: gif.width, height: gif.height }));
}

export const isFavorite = (url: string) => url in getFavoritesMap();

export function addFavorite(gif: Gif) {
    if (isFavorite(gif.url)) return;
    FavoriteGifActions.addFavoriteGif({
        url: gif.url,
        src: gif.src,
        gifSrc: gif.gifSrc,
        width: gif.width,
        height: gif.height,
        format: isVideo(gif.src) ? GifFormat.VIDEO : GifFormat.IMAGE
    });
}

export function toggleFavorite(gif: Gif) {
    if (isFavorite(gif.url)) FavoriteGifActions.removeFavoriteGif(gif.url);
    else addFavorite(gif);
}

const LEGACY_RECENT_KEY = "GifBrowser_recent";
const RECENT_PATH = "plugins.GifBrowser.recent";
const MAX_RECENT = 100;
const NO_RECENT: Gif[] = [];

const getRecent = (): Gif[] => settings.plain.recent ?? NO_RECENT;

export async function startRecent() {
    const legacy = await DataStore.get<Gif[]>(LEGACY_RECENT_KEY);
    if (legacy) {
        const urls = new Set(getRecent().map(gif => gif.url));
        settings.store.recent = [...getRecent(), ...legacy.filter(gif => !urls.has(gif.url))].slice(0, MAX_RECENT);
        await DataStore.del(LEGACY_RECENT_KEY);
    }
}

function addRecent({ url, src, width, height, id, gifSrc }: Gif) {
    const gif: Gif = { url, src, width, height, ...(id && { id }), ...(gifSrc && { gifSrc }) };
    settings.store.recent = [gif, ...getRecent().filter(g => g.url !== url)].slice(0, MAX_RECENT);
}

export function clearRecent() {
    settings.store.recent = [];
}

export function useRecent() {
    return React.useSyncExternalStore(
        listener => {
            SettingsStore.addChangeListener(RECENT_PATH, listener);
            return () => SettingsStore.removeChangeListener(RECENT_PATH, listener);
        },
        getRecent
    );
}

export function sendGif(channelId: string, gif: Gif, query: string) {
    sendMessage(
        channelId,
        { content: gif.url },
        false,
        MessageActions.getSendMessageOptionsForReply(PendingReplyStore.getPendingReply(channelId))
    ).then(() => {
        FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    });

    registerShare(gif, query);
    addRecent(gif);
}

export function insertGif(gif: Gif, query: string) {
    insertTextIntoChatInputBox(`${gif.url} `);
    registerShare(gif, query);
    addRecent(gif);
}

