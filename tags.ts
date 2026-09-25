/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import { React } from "@webpack/common";

export interface GifTagsData {
    tags: string[];
    gifs: Record<string, string[]>;
}

export interface GifTagsApi {
    getData(): GifTagsData;
    subscribe(listener: () => void): () => void;
    getGifTags(url: string): string[];
    findTag(name: string): string | undefined;
    createTag(name: string): string | null;
    setTagForGifs(urls: Iterable<string>, tag: string, enabled: boolean): void;
}

export function getGifTagsApi(): GifTagsApi | null {
    if (!isPluginEnabled("GifTags")) return null;
    return (plugins.GifTags as any)?.api ?? null;
}

const noopSubscribe = () => () => { };
const getNull = () => null;

export function useGifTags() {
    const api = getGifTagsApi();
    const data = React.useSyncExternalStore(api?.subscribe ?? noopSubscribe, api?.getData ?? getNull);

    return api && data ? { api, data } : null;
}
