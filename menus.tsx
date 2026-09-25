/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/discord";
import { ContextMenuApi, Menu } from "@webpack/common";

import { addFavorite, Gif, isFavorite, toggleFavorite } from "./api";
import { openTagNameModal } from "./TagNameModal";
import { GifTagsApi, GifTagsData, useGifTags } from "./tags";

export interface GifActions {
    send(gif: Gif, keepOpen: boolean): void;
    insert(gif: Gif): void;
}

function applyTag(api: GifTagsApi, gifs: Gif[], tag: string, enabled: boolean) {
    if (enabled) gifs.forEach(addFavorite);
    api.setTagForGifs(gifs.map(gif => gif.url), tag, enabled);
}

function tagItems({ api, data }: { api: GifTagsApi; data: GifTagsData; }, gifs: Gif[], idPrefix: string) {
    return [
        ...data.tags.map(tag => {
            const onAll = gifs.every(gif => data.gifs[gif.url]?.includes(tag));

            return (
                <Menu.MenuCheckboxItem
                    key={tag}
                    id={`${idPrefix}-${tag}`}
                    label={tag}
                    checked={onAll}
                    action={() => applyTag(api, gifs, tag, !onAll)}
                />
            );
        }),
        data.tags.length ? <Menu.MenuSeparator key="separator" /> : null,
        <Menu.MenuItem
            key="new"
            id={`${idPrefix}-new`}
            label="New Tag..."
            action={() => openTagNameModal("New Tag", name => {
                const tag = api.createTag(name);
                if (tag) applyTag(api, gifs, tag, true);
            })}
        />
    ];
}

export function GifContextMenu({ gif, actions }: { gif: Gif; actions: GifActions; }) {
    const tags = useGifTags();
    const favorite = isFavorite(gif.url);

    return (
        <Menu.Menu
            navId="vc-gif-browser"
            onClose={ContextMenuApi.closeContextMenu}
        >
            <Menu.MenuGroup>
                <Menu.MenuItem id="vc-gif-browser-send" label="Send" action={() => actions.send(gif, false)} />
                <Menu.MenuItem id="vc-gif-browser-send-keep" label="Send & Keep Open" action={() => actions.send(gif, true)} />
                <Menu.MenuItem id="vc-gif-browser-insert" label="Insert Link" action={() => actions.insert(gif)} />
                <Menu.MenuItem id="vc-gif-browser-copy" label="Copy Link" action={() => copyWithToast(gif.url)} />
            </Menu.MenuGroup>
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id="vc-gif-browser-favorite"
                    label={favorite ? "Remove from Favorites" : "Add to Favorites"}
                    action={() => toggleFavorite(gif)}
                />
                {tags ? (
                    <Menu.MenuItem id="vc-gif-browser-tags" label="Tags">
                        {tagItems(tags, [gif], "vc-gif-browser-tag")}
                    </Menu.MenuItem>
                ) : null}
            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

export function BulkTagMenu({ gifs }: { gifs: Gif[]; }) {
    const tags = useGifTags();

    return (
        <Menu.Menu
            navId="vc-gif-browser-bulk"
            onClose={ContextMenuApi.closeContextMenu}
        >
            {tags ? tagItems(tags, gifs, "vc-gif-browser-bulk-tag") : null}
        </Menu.Menu>
    );
}
