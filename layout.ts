/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Gif } from "./api";

export interface TileRect {
    x: number;
    y: number;
    width: number;
    height: number;
    column: number;
}

export interface MasonryLayout {
    rects: TileRect[];
    columns: number[][];
    height: number;
}

const MIN_RATIO = 0.3;
const MAX_RATIO = 3;

export function computeMasonry(gifs: Gif[], containerWidth: number, targetColumnWidth: number, gap: number): MasonryLayout {
    const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (targetColumnWidth + gap)));
    const columnWidth = Math.max(0, (containerWidth - gap * (columnCount - 1)) / columnCount);

    const heights = new Array<number>(columnCount).fill(0);
    const columns = Array.from({ length: columnCount }, () => [] as number[]);

    const rects = gifs.map((gif, i) => {
        const ratio = gif.width > 0 && gif.height > 0 ? gif.height / gif.width : 1;
        const height = Math.round(columnWidth * Math.min(Math.max(ratio, MIN_RATIO), MAX_RATIO));

        const column = heights.indexOf(Math.min(...heights));
        const rect = { x: column * (columnWidth + gap), y: heights[column], width: columnWidth, height, column };

        heights[column] += height + gap;
        columns[column].push(i);
        return rect;
    });

    return { rects, columns, height: Math.max(0, Math.max(...heights) - gap) };
}

export function neighbour({ rects, columns }: MasonryLayout, from: number, direction: "up" | "down" | "left" | "right") {
    const rect = rects[from];
    const column = columns[rect.column];
    const position = column.indexOf(from);

    switch (direction) {
        case "up":
            return column[position - 1] ?? from;
        case "down":
            return column[position + 1] ?? from;
        case "left":
        case "right": {
            const target = columns[rect.column + (direction === "left" ? -1 : 1)];
            if (!target?.length) return from;

            const center = rect.y + rect.height / 2;
            let best = target[0];
            for (const i of target) {
                const c = rects[i].y + rects[i].height / 2;
                if (Math.abs(c - center) < Math.abs(rects[best].y + rects[best].height / 2 - center)) best = i;
            }
            return best;
        }
    }
}
